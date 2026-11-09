<?php

declare(strict_types=1);

namespace App\Core\Authorization\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateRoleRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('roles', 'name')->where('guard_name', 'web')->ignore($this->route('role')),
            ],
        ];
    }
}
