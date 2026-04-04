'use client';

import { useState, useEffect, useRef } from 'react';
import { useApi } from '@/lib/swr';
import { Check, HelpCircle } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal';

const ROLES = [
  { value: 'developer', label: '💻 Developer' },
  { value: 'marketer', label: '📢 Marketer' },
  { value: 'content_creator', label: '✏️ Content Creator' },
  { value: 'other', label: '⭐ Other' },
];

interface MeResponse {
  user: {
    id: number;
    email: string;
    firstname?: string;
    lastname?: string;
    avatar?: string | null;
  };
}

export default function AccountPage() {
  const { data: me, mutate: mutateMe } = useApi<MeResponse>('/api/admin/user/me');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [role, setRole] = useState('developer');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const {
    showModal: showUnsavedModal,
    handleConfirm: confirmUnsaved,
    handleCancel: cancelUnsaved,
  } = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (me?.user) {
      setFirstname(me.user.firstname ?? '');
      setLastname(me.user.lastname ?? '');
    }
  }, [me]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    await fetch('/api/admin/user/avatar', { method: 'POST', body: form });
    await mutateMe();
    setUploading(false);
    e.target.value = '';
  }

  async function handleSave() {
    setSaving(true);
    await fetch('/api/admin/user/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstname, lastname }),
    });
    setSaving(false);
    setIsDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Account</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          <Check className="size-4" />
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-8">
        <UserAvatar
          name={`${firstname} ${lastname}`.trim() || me?.user?.email}
          src={me?.user?.avatar ?? null}
          size="xl"
        />
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-teal-600 hover:underline font-medium disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
          <p className="text-xs text-gray-400 mt-0.5">Recommended: 500px x 500px (JPG or PNG)</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Email */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Email <span className="text-red-500">*</span>
            <HelpCircle className="size-3.5 text-gray-400" />
          </label>
          <input
            type="email"
            value={me?.user?.email ?? ''}
            readOnly
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          />
        </div>

        {/* First name */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            First name <HelpCircle className="size-3.5 text-gray-400" />
          </label>
          <input
            type="text"
            value={firstname}
            onChange={(e) => {
              setFirstname(e.target.value);
              setIsDirty(true);
            }}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Last name */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Last name <HelpCircle className="size-3.5 text-gray-400" />
          </label>
          <input
            type="text"
            value={lastname}
            onChange={(e) => {
              setLastname(e.target.value);
              setIsDirty(true);
            }}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Role */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Role <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  setRole(r.value);
                  setIsDirty(true);
                }}
                className={cn(
                  'px-4 py-2.5 text-sm rounded-md border transition-colors text-left',
                  role === r.value
                    ? 'border-teal-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-gray-300',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <UnsavedChangesModal
        open={showUnsavedModal}
        onConfirm={confirmUnsaved}
        onCancel={cancelUnsaved}
      />
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
