'use client';

import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor';

export interface SavedImageData {
  name: string;
  extension: string;
  mimeType: string;
  fullName?: string;
  height?: number;
  width?: number;
  imageBase64?: string;
  imageCanvas?: HTMLCanvasElement;
}

interface ImageEditorInnerProps {
  imageUrl: string;
  onSave: (data: SavedImageData) => void;
  onClose: () => void;
}

export default function ImageEditorInner({ imageUrl, onSave, onClose }: ImageEditorInnerProps) {
  return (
    <div className="w-full h-full bg-white">
      <FilerobotImageEditor
        source={imageUrl}
        onSave={(savedImageData) => onSave(savedImageData as SavedImageData)}
        onClose={onClose}
        closeAfterSave={false}
        savingPixelRatio={1}
        previewPixelRatio={typeof window !== 'undefined' ? window.devicePixelRatio : 1}
        tabsIds={[
          TABS.ADJUST,
          TABS.FINETUNE,
          TABS.FILTERS,
          TABS.ANNOTATE,
          TABS.WATERMARK,
          TABS.RESIZE,
        ]}
        defaultTabId={TABS.ADJUST}
        defaultToolId={TOOLS.CROP}
        Rotate={{ angle: 90, componentType: 'slider' }}
        Text={{ text: 'Type here...' }}
        annotationsCommon={{ fill: '#ff0000' }}
        Crop={{
          presetsItems: [
            { titleKey: '4:3', ratio: 4 / 3 },
            { titleKey: '16:9', ratio: 16 / 9 },
            { titleKey: '1:1', ratio: 1 },
            { titleKey: '3:4', ratio: 3 / 4 },
            { titleKey: '9:16', ratio: 9 / 16 },
          ],
          presetsFolders: [],
        }}
      />
    </div>
  );
}
