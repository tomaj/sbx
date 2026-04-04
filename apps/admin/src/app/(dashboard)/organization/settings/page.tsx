import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Organization Settings' };

export default function OrgSettingsPage() {
  const fields = [
    { label: 'Organization name', value: 'Slovak Telekom' },
    { label: 'Email', value: 'tomas1.majer@telekom.sk' },
    { label: 'Country', value: '🇸🇰 Slovakia' },
    { label: 'Street', value: '28 Bajkalská' },
    { label: 'Zip', value: '817 62' },
    { label: 'City', value: 'Bratislava' },
  ];

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        Organization Details
      </h1>

      <div className="space-y-6">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className="text-sm text-gray-900 dark:text-gray-100">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
