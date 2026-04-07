# Admin UI — Komponentový systém

High-level prehľad všetkých dostupných komponentov, hookov a patterov. Slúži ako referencia pri implementácii nových funkcionalít — aby sme vždy vedeli čo existuje a z čoho poskladať novú stránku.

---

## Hooks (`src/hooks/`)

| Hook | Súbor | Čo robí |
|------|-------|---------|
| `useApi<T>(url)` | `lib/swr.ts` | SWR data fetching s typom; vracia `{ data, isLoading, mutate }` |
| `useCrudForm` | `use-crud-form.ts` | react-hook-form + zod pre create/edit formuláre; resets pri otvorení sidebaru |
| `useCrudSidebar<T>` | `use-crud-sidebar.ts` | Stav sidebaru: `open`, `selected`, `openCreate()`, `openEdit(item)`, `close()` |
| `useDelete<T>` | `use-delete.ts` | Potvrdzovací flow pre mazanie; vracia `{ confirm(item), modal }` |
| `useContextMenu` | `use-context-menu.ts` | `open/toggle/close` + `ref` pre dropdown s outside-click detekciou |
| `useUnsavedChanges` | `use-unsaved-changes.ts` | Sleduje dirty stav formu, zobrazí modal pri opustení |
| `usePerPage` | `use-per-page.ts` | Persistovaná veľkosť stránky cez localStorage |
| `useCrudList` | `use-crud-list.ts` | Kombinuje stránkovanie + filter + sort pre list stránky |

---

## UI Primitívy (`src/components/ui/`)

### Formulárové prvky

| Komponent | Čo robí |
|-----------|---------|
| `FormField` | Label + description + children wrapper pre jeden riadok formu |
| `inputCls` | Tailwind class string pre `<input>` — importuj spolu s `FormField` |
| `SelectDropdown` | Styled select s options; používaj s `Controller` z react-hook-form |
| `Toggle` | Boolean on/off prepínač |
| `DateField` | Datetime picker |
| `InputWithCounter` | Text input so zobrazeným počtom znakov |
| `TagsMultiselect` | Multi-select pre tagy |
| `CheckboxDropdown` | Dropdown s checkboxmi |
| `ContentTypeSelector` | Selector content-type komponentov |

### Akčné prvky

| Komponent | Čo robí |
|-----------|---------|
| `IconButton` | Malé štvorcové tlačidlo s ikonou; `variant`: `default`/`danger`, `size`: `sm`/`md` |
| `Button` | Štandardizované tlačidlo s variantmi |
| `CopyButton` | Tlačidlo na kopírovanie textu do clipboardu |
| `DropdownMenu` | Kontextové menu s ikonami; `items[]` s `label/icon/onClick/variant` |

### Zobrazenie dát

| Komponent | Čo robí |
|-----------|---------|
| `DataTable<T>` | Plnohodnotná tabuľka: sorting, selection, pagination, skeleton, empty state |
| `TreeNav<T>` | Generický hierarchický strom: expand/collapse, pinned items, search, actions |
| `Pagination` | Stránkovanie; používaj cez `DataTable` alebo standalone |
| `SearchBar` | Search input s ikonou a clear tlačidlom |
| `SearchFilterBar` | Rozšírený filter bar s viacerými filtrami |
| `TimeAgo` | Relatívny čas ("2 hours ago") |
| `UserAvatar` | Avatar používateľa s fallback initials |

### Badges a indikátory

| Komponent | Čo robí |
|-----------|---------|
| `Badge` / `AccessBadge` | Farebný badge; `AccessBadge` pre token access level |
| `RoleBadge` | Badge pre rolu používateľa |
| `StatusBadge` | Active/disabled status |
| `StatCard` | Metrikový card: ikona + label + hodnota |

### Modaly a panely

| Komponent | Čo robí |
|-----------|---------|
| `RightSidebar` | Slide-in panel zprava; `header` + `footer` slots |
| `CrudSidebarForm` | `RightSidebar` + štandardný footer (Cancel/Save/Delete) + UnsavedChangesModal + ConfirmModal pre delete |
| `ConfirmModal` | Potvrdzovací dialog; `dangerous` prop pre červené potvrdenie |
| `UnsavedChangesModal` | Modal pri opúšťaní formu s neuloženými zmenami |
| `RenameModal` | Jednoduchý modal pre rename s input fieldom |

### Skeleton / Loading

| Komponent | Čo robí |
|-----------|---------|
| `SkeletonText` | Animovaný text placeholder; props: `width`, `height` |
| `SkeletonBlock` | Blokový placeholder; props: `width`, `height` |
| `SkeletonAvatar` | Kruhový avatar placeholder |
| `SkeletonBadge` | Badge placeholder |

### Layout

| Komponent | Čo robí |
|-----------|---------|
| `PageLayout` | Stránkový wrapper: `title` + `description` + `action` slot |
| `CrudSettingsPage` | `PageLayout` + "New X" tlačidlo + `sidebar`/`extras` sloty |
| `SplitPageLayout` | Horizontálne rozdelená stránka: sidebar panel + hlavný obsah |
| `SettingsSection` | Sekcia v settings stránke s nadpisom a popisom |
| `SplitPageLayout` | Split view s ľavým panelom (napr. strom) a pravou časťou |
| `EmptyState` | Prázdny stav so správou a voliteľnou akciou |
| `Tabs` | Tab navigator |
| `BulkActionBar` | Akčný bar pre bulk operácie (zobrazuje sa keď sú vybrané položky) |
| `InfoTooltip` | Malá ikona s tooltip textom |

---

## Kompozitné komponenty (feature-level)

### Assets (`src/components/assets/`)

| Komponent | Čo robí |
|-----------|---------|
| `FolderTree` | Stromová navigácia adresárov; wrapper nad `TreeNav` |
| `AssetGrid` | Grid zobrazenie assetov |
| `AssetList` | Zoznam assetov |
| `AssetThumb` | Thumbnail jedného assetu |
| `AssetDetailModal` | Detail + editácia assetu (tabs: overview / references) |
| `AssetPickerModal` | Picker pre výber assetu z knižnice |
| `UploadAssetsModal` | Upload nových assetov |
| `CreateFolderModal` | Vytvorenie nového adresára |

### Block Library (`src/components/block-library/`)

| Komponent | Čo robí |
|-----------|---------|
| `GroupTree` | Stromová navigácia skupín komponentov; wrapper nad `TreeNav` |
| `BlockList` | Zoznam komponentov v skupne |
| `BlockIcons` | Ikony pre typy komponentov |
| `CreateBlockModal` | Vytvorenie nového bloku |
| `CreateGroupModal` | Vytvorenie novej skupiny |
| `EditBlockModal` | Plný editor komponentu (tabs: Fields / Config / Versions) |
| `FieldEditor` | Editor jedného poľa bloku (1 966r — kandidát na rozdelenie) |
| `FieldIcon` | Ikona podľa typu poľa |

### Stories (`src/components/stories/`)

| Komponent | Čo robí |
|-----------|---------|
| `StoryList` | Zoznam stories s breadcrumb + filtráciou |
| `StoryFiltersBar` | Filter bar pre zoznam stories |
| `CreateStoryPanel` | Panel pre vytvorenie novej story |
| `ReleaseSwitcher` | Prepínač releasov s preview |
| `BranchSwitcher` | Prepínač vetiev |

### Story Editor (`src/components/story-editor/`)

| Komponent | Čo robí |
|-----------|---------|
| `StoryEditor` | Hlavný editor story (tabs: Edit / Info / Workflow / Comments / Config) |
| `FieldRenderer` | Dispatchuje rendering podľa typu poľa |
| `EditTab` | Tab s editovateľnými poliami |
| `ConfigTab` | Tab s nastaveniami story (slug, SEO, dátumy) |
| `InfoTab` | Metadáta story |
| `CommentTab` | Komentáre a diskusie |
| `LayersPanel` | Panel so stromom blokov |
| `InsertBlockPanel` | Panel pre vloženie bloku |
| `PreviewFrame` | Iframe preview story |
| `FieldDiscussionPanel` | Diskusie k single poľu |
| `StoryHistoryPanel` | História verzií story |
| `BlockLibraryModal` | Modal pre výber bloku |
| `StoryPickerModal` | Picker pre výber jednej story |
| `StoryPickerMultiModal` | Picker pre výber viacerých stories |

### Story Editor — polia (`src/components/story-editor/fields/`)

Každé pole je standalone komponent. Malé polia (< 50r) sú ideálne:

| Pole | Veľkosť | Poznámka |
|------|---------|---------|
| `TextField` | ~37r | OK |
| `TextareaField` | ~37r | OK |
| `NumberField` | ~33r | OK |
| `BooleanField` | ~41r | OK |
| `DatetimeField` | ~37r | OK |
| `MarkdownField` | ~32r | OK |
| `SectionField` | ~20r | OK |
| `TableField` | ~48r | OK |
| `OptionField` | ~135r | OK |
| `AssetField` | ~212r | Prijateľné |
| `CustomPluginField` | ~125r | OK |
| `OptionsField` | ~359r | Refaktorovať |
| `BloksField` | ~538r | Refaktorovať |
| `LinkField` | ~542r | Refaktorovať |
| `RichtextField` | ~662r | Refaktorovať |

### Spaces (`src/components/spaces/`)

| Komponent | Čo robí |
|-----------|---------|
| `SpaceCard` | Karta jedného spacu |
| `SpacesGrid` | Grid spaceov |
| `CreateSpacePanel` | Panel pre vytvorenie spacu |
| `AddUserPanel` | Panel pre pridanie používateľa do spacu |
| `PermissionGrid` | Grid oprávnení |

### Sidebar (`src/components/sidebar/`)

| Komponent | Čo robí |
|-----------|---------|
| `Sidebar` | Hlavný navigačný sidebar |
| `NavLinks` | Navigačné linky (dynamické podľa spacu) |
| `UserMenu` | Menu používateľa v sidebari |

### Activities (`src/components/activities/`)

| Komponent | Čo robí |
|-----------|---------|
| `ActivitiesTable` | Tabuľka aktivít s type badges |
| `activityUtils` | Helpers pre formátovanie activity záznamu |

### Dashboard (`src/components/dashboard/`)

| Komponent | Čo robí |
|-----------|---------|
| `ApiRequestsChart` | Graf API requestov |
| `ContentActivitiesChart` | Graf content aktivít |

---

## Ako poskladať novú funkciu

### Nová settings stránka (CRUD)

Typická settings stránka: list + create/edit form v sidebari + delete.

```tsx
'use client';

// 1. Dáta + hooks
const { data, isLoading, mutate } = useApi<{ items: MyItem[] }>(`/api/admin/...`);
const { open, selected, openCreate, openEdit, close } = useCrudSidebar<MyItem>();
const deleteHook = useDelete<MyItem>({ getUrl: (i) => `/api/admin/.../` + i.id, onSuccess: mutate, ... });

// 2. Layout
return (
  <CrudSettingsPage
    title="My Items"
    description="Manage your items."
    addLabel="New Item"
    onAdd={openCreate}
    sidebar={<MyItemForm open={open} item={selected} onClose={close} onSaved={() => { close(); mutate(); }} />}
    extras={deleteHook.modal}
  >
    <DataTable
      columns={columns}      // Column<MyItem>[] s render + skeletonRender
      data={items}
      keyField="id"
      isLoading={isLoading}
      emptyMessage="No items yet."
    />
  </CrudSettingsPage>
);

// 3. Form (v CrudSidebarForm)
function MyItemForm({ open, item, onClose, onSaved }) {
  const { form, onSubmit } = useCrudForm({ schema, defaultValues, mode, item, open, getInitialValues, buildRequest, onSuccess: onSaved });
  return (
    <CrudSidebarForm open={open} onClose={onClose} title={item ? 'Edit' : 'New'} isSubmitting={form.formState.isSubmitting} isDirty={form.formState.isDirty} onSubmit={onSubmit}>
      <FormField label="Name"><input {...form.register('name')} className={inputCls} /></FormField>
    </CrudSidebarForm>
  );
}
```

### Nová split stránka (strom + obsah)

Stránky kde ľavý panel = navigácia (strom), pravý = obsah (assets, block-library).

```tsx
<SplitPageLayout
  sidebar={
    <TreeNav
      items={items.map(i => ({ id: i.id, parentId: i.parent_id, label: i.name }))}
      selectedId={selectedId}
      onSelect={setSelectedId}
      actions={[
        { label: 'Rename', icon: Pencil, onClick: handleRename },
        { label: 'Delete', icon: Trash2, onClick: handleDelete, variant: 'danger' },
      ]}
      pinnedItems={[{ id: 'root', label: 'Root', icon: Home, selected: selectedId === null, onClick: () => setSelectedId(null) }]}
    />
  }
>
  {/* Hlavný obsah */}
</SplitPageLayout>
```

### Kontextové menu v tabuľke / liste

```tsx
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { IconButton } from '@/components/ui/icon-button';

// V column.render():
<div className="flex items-center justify-end gap-1">
  <IconButton icon={Settings} onClick={() => openEdit(row)} title="Edit" />
  <IconButton icon={Trash2} onClick={() => deleteHook.confirm(row)} variant="danger" title="Delete" />
  <DropdownMenu items={[
    { label: 'Duplicate', icon: Copy, onClick: () => handleDuplicate(row) },
    { label: 'Delete', icon: Trash2, onClick: () => deleteHook.confirm(row), variant: 'danger' },
  ]} />
</div>
```

### Loading skeleton

Nepoužívaj spinner ani "Loading..." text. Vždy `skeletonRender` na DataTable stĺpcoch:

```tsx
const columns: Column<MyItem>[] = [
  {
    key: 'name',
    label: 'Name',
    render: (i) => <span>{i.name}</span>,
    skeletonRender: () => <SkeletonText width="w-40" />,
  },
  {
    key: 'status',
    label: 'Status',
    render: (i) => <StatusBadge disabled={i.disabled} />,
    skeletonRender: () => <SkeletonBadge width="w-16" />,
  },
];
// DataTable s isLoading={true} automaticky zobrazí skeleton riadky
```

---

## Pravidlá

- **Delete** → vždy `useDelete` + `ConfirmModal`, nikdy `window.confirm()`
- **Edit/Create panel** → vždy `CrudSidebarForm` / `RightSidebar`, nikdy centered modal
- **Loading** → vždy skeleton (`skeletonRender` v DataTable alebo `SkeletonText/Block`), nikdy spinner
- **Search** → vždy `SearchBar` z `@/components/ui/search-bar`, nikdy inline input
- **Formuláre** → `react-hook-form` + `zod` + `useCrudForm`, `Controller` pre komplexné inputy
- **Dáta** → `useApi()` zo `@/lib/swr`, nikdy `useState + useEffect + fetch`
- **Mutácia po akcii** → vždy `mutate()` zo SWR na revalidáciu
- **Dropdown/kontextové menu** → `DropdownMenu`, nikdy inline `useState + useRef + useEffect`

---

## Súbory ktoré treba ešte refaktorovať

Tieto komponenty sú ešte príliš veľké a sú kandidátmi na ďalšie rozdelenie:

| Súbor | Riadky | Plán |
|-------|--------|------|
| `block-library/edit-block-modal/field-editor.tsx` | 1 966 | Rozdeliť podľa typu poľa na 7-8 súborov |
| `story-editor/index.tsx` | 1 280 | Vyčleniť toolbar, tab containers |
| `settings/roles/page.client.tsx` | 988 | Vyčleniť RoleForm, RolesList |
| `story-editor/story-history-panel.tsx` | 830 | Vyčleniť HistoryTimeline, HistoryDetail |
| `settings/ai-settings/page.client.tsx` | 777 | Rozdeliť podľa tabov |
| `block-library/edit-block-modal/index.tsx` | 759 | Vyčleniť tab containers |
| `story-editor/fields/richtext-field.tsx` | 662 | Vyčleniť toolbar, plugins |
| `story-editor/fields/bloks-field.tsx` | 538 | Refaktorovať |
| `story-editor/fields/link-field.tsx` | 542 | Refaktorovať |
