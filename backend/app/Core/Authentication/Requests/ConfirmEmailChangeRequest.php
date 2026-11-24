<?php

declare(strict_types=1);

namespace App\Core\Authentication\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ConfirmEmailChangeRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'id' => ['required', 'string', 'uuid'],
            'token' => ['required', 'string', 'size:64'],
        ];
    }
}
