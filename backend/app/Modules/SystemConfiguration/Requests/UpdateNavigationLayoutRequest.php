<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Requests;

use App\Core\Modules\ModuleCatalog;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class UpdateNavigationLayoutRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'sections' => ['required', 'array', 'list', 'max:20'],
            'sections.*' => ['array:key,label,items'],
            'sections.*.key' => ['required', 'string', 'regex:/^[a-z0-9-]{1,50}$/', 'distinct'],
            'sections.*.label' => ['required', 'string', 'max:50'],
            'sections.*.items' => ['present', 'array', 'list'],
            'sections.*.items.*' => ['array:key,label,hidden'],
            'sections.*.items.*.key' => ['required', 'string', 'distinct'],
            'sections.*.items.*.label' => ['nullable', 'string', 'max:50'],
            'sections.*.items.*.hidden' => ['required', 'boolean:strict'],
            'version' => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * @return list<Closure(Validator): void>
     */
    public function after(): array
    {
        return [$this->placesEveryRegisteredItem(...)];
    }

    private function placesEveryRegisteredItem(Validator $validator): void
    {
        if ($validator->errors()->isNotEmpty()) {
            return;
        }

        $items = app(ModuleCatalog::class)->menuItems();
        $placed = [];

        /** @var list<array{key: string, label: string, items: list<array{key: string, label: string|null, hidden: bool}>}> $sections */
        $sections = $this->input('sections');

        foreach ($sections as $sectionIndex => $section) {
            foreach ($section['items'] as $itemIndex => $entry) {
                $path = "sections.{$sectionIndex}.items.{$itemIndex}";
                $item = $items[$entry['key']] ?? null;

                if ($item === null) {
                    $validator->errors()->add("{$path}.key", __('validation.menu_item_unknown', ['item' => $entry['key']]));

                    continue;
                }

                $placed[] = $item->key;

                if ($entry['hidden'] && ! $item->canHide) {
                    $validator->errors()->add("{$path}.hidden", __('validation.menu_item_always_visible', ['item' => $item->label]));
                }
            }
        }

        foreach (array_diff(array_keys($items), $placed) as $missing) {
            $validator->errors()->add('sections', __('validation.menu_item_missing', ['item' => $items[$missing]->label]));
        }
    }
}
