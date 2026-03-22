import { Controller, Get, Inject, NotFoundException, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SessionGuard } from '../auth/session.guard';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { apiTokens } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';

const BRIDGE_SCRIPT = `(function () {
  'use strict';

  /**
   * SBX Visual Editor Bridge v2
   * Compatible with @storyblok/js StoryblokBridge interface
   */
  class StoryblokBridge {
    constructor(options) {
      this._options = options || {};
      this._callbacks = {};
      this._isEditor = window.self !== window.top;

      if (!this._isEditor) {
        console.warn('[SBX Bridge] Not in editor context, bridge inactive');
        return;
      }

      window.addEventListener('message', (event) => {
        try {
          var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (!data || typeof data.action !== 'string') return;
          this._dispatch(data.action, data);
        } catch (_) {}
      });

      this._sendToParent({ action: 'loaded' });
      this._setupClickHandlers();
      console.log('[SBX Bridge] ready, waiting for editor messages');
    }

    on(actions, callback) {
      var list = Array.isArray(actions) ? actions : [actions];
      list.forEach(function(action) {
        if (!this._callbacks[action]) this._callbacks[action] = [];
        this._callbacks[action].push(callback);
      }, this);
    }

    pingEditor(callback) {
      if (callback) this.on('pong', callback);
      this._sendToParent({ action: 'ping' });
    }

    isInEditor() {
      return this._isEditor;
    }

    enterEditmode() {
      this._sendToParent({ action: 'enterEditmode' });
    }

    _dispatch(action, payload) {
      var callbacks = this._callbacks[action] || [];
      callbacks.forEach(function(cb) {
        try { cb(payload); } catch (e) { console.error('[SBX Bridge] callback error', e); }
      });
    }

    _sendToParent(data) {
      try { window.parent.postMessage(data, '*'); } catch (_) {}
    }

    _setupClickHandlers() {
      document.addEventListener('click', function(event) {
        var el = event.target.closest('[data-blok-uid]');
        if (!el) return;
        this._sendToParent({
          action: 'blokClicked',
          blokUid: el.dataset.blokUid,
          blokC: el.dataset.blokC || null,
        });
      }.bind(this), true);
    }
  }

  window.StoryblokBridge = StoryblokBridge;

  // Implement storyblokRegisterEvent — used by @storyblok/js registerStoryblokBridge.
  // Callbacks registered before this script loaded are queued and fired now.
  var _preQueue = window._sbxRegisterQueue || [];
  window.storyblokRegisterEvent = function(cb) {
    // Called with a callback: execute it immediately (bridge is ready)
    if (typeof cb === 'function') { try { cb(); } catch(e) {} return; }
    // Called with no args (from loadBridge onload) — also a no-op here
  };
  // Fire any pre-queued callbacks
  _preQueue.forEach(function(fn) { try { fn(); } catch(e) {} });
  window._sbxRegisterQueue = null;

  console.log('[SBX Bridge] ready');
})();
`;

@Controller()
export class BridgeController {
  constructor(@Inject(DB) private db: DbType) {}

  @Get('bridge/v2-latest.js')
  getBridgeScript(@Res() res: Response): void {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(BRIDGE_SCRIPT);
  }

  @Get('v1/admin/spaces/:spaceId/preview-token')
  @UseGuards(SessionGuard)
  async getPreviewToken(@Param('spaceId') spaceId: string) {
    const spaceIdNum = parseInt(spaceId, 10);
    const timestamp = Math.floor(Date.now() / 1000);

    // Try preview (private) token first, fall back to public
    let tokenRow = null;

    const privateTokens = await this.db
      .select()
      .from(apiTokens)
      .where(and(eq(apiTokens.spaceId, spaceIdNum), eq(apiTokens.tokenType, 'private')))
      .limit(1);

    if (privateTokens.length > 0) {
      tokenRow = privateTokens[0];
    } else {
      const publicTokens = await this.db
        .select()
        .from(apiTokens)
        .where(and(eq(apiTokens.spaceId, spaceIdNum), eq(apiTokens.tokenType, 'public')))
        .limit(1);
      if (publicTokens.length > 0) {
        tokenRow = publicTokens[0];
      }
    }

    if (!tokenRow) {
      throw new NotFoundException('No CDN token found for this space');
    }

    const accessToken = tokenRow.token;
    const hash = createHash('sha1')
      .update(`${spaceIdNum}:${accessToken}:${timestamp}`)
      .digest('hex');

    return {
      space_id: spaceIdNum,
      timestamp,
      token: hash,
      access_token: accessToken,
    };
  }
}
