<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Requests;

use App\Core\Modules\ModuleCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateModulesRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'disabled' => ['present', 'array', 'list'],
            'disabled.*' => ['string', 'distinct', Rule::in(app(ModuleCatalog::class)->optionalModuleKeys())],
            'version' => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * @return list<string>
     */
    public function disabledModules(): array
    {
        /** @var list<string> $disabled */
        $disabled = $this->validated('disabled');
        sort($disabled);

        return $disabled;
    }
}
