import axios from 'axios';

const FALLBACK_MESSAGE = 'Permintaan tidak dapat diproses. Coba lagi beberapa saat.';

const MESSAGES_BY_CODE: Record<string, string> = {
    NETWORK_ERROR: 'Server tidak dapat dihubungi. Periksa koneksi Anda lalu coba lagi.',
    AUTH_UNAUTHENTICATED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
    AUTH_FORBIDDEN: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
    AUTH_INVALID_CREDENTIALS: 'Email atau password salah.',
    AUTH_PASSWORD_RESET_INVALID: 'Tautan reset password tidak valid atau sudah kedaluwarsa.',
    AUTH_PRIVILEGE_ESCALATION: 'Anda tidak dapat memberikan akses melebihi kewenangan Anda.',
    CSRF_TOKEN_MISMATCH: 'Sesi formulir telah berakhir. Muat ulang halaman lalu coba lagi.',
    VALIDATION_FAILED: 'Periksa kembali data yang Anda isi.',
    INVALID_REQUEST: 'Permintaan tidak valid.',
    RESOURCE_NOT_FOUND: 'Data tidak ditemukan.',
    RESOURCE_CONFLICT: 'Data bentrok dengan kondisi saat ini.',
    RESOURCE_VERSION_CONFLICT:
        'Data telah diubah oleh pengguna lain. Muat ulang lalu simpan kembali.',
    METHOD_NOT_ALLOWED: 'Tindakan ini tidak didukung.',
    PAYLOAD_TOO_LARGE: 'Ukuran data terlalu besar.',
    UNSUPPORTED_MEDIA_TYPE: 'Jenis berkas tidak didukung.',
    TOO_MANY_REQUESTS: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
    SERVICE_UNAVAILABLE: 'Layanan sedang tidak tersedia. Coba lagi beberapa saat.',
    SYSTEM_INTERNAL_ERROR: 'Terjadi gangguan pada server. Coba lagi beberapa saat.',
    ROLE_PROTECTED: 'Role bawaan tidak dapat diubah.',
    ROLE_IN_USE: 'Role masih dipakai oleh pengguna.',
    DEPARTMENT_HAS_DEPENDENCIES: 'Departemen masih memiliki pengguna atau sub-departemen.',
    USER_SELF_DEACTIVATION: 'Anda tidak dapat menonaktifkan akun sendiri.',
    USER_LAST_SUPER_ADMIN: 'Super Admin aktif terakhir tidak dapat dinonaktifkan.',
};

interface ErrorBody {
    code?: string;
    errors?: Record<string, string[]> | null;
}

interface ApiErrorDetails {
    status: number;
    code: string;
    fieldErrors?: Record<string, string[]>;
    retryAfterSeconds?: number;
    requestId?: string;
}

export class ApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly fieldErrors: Record<string, string[]>;
    readonly retryAfterSeconds: number | undefined;
    readonly requestId: string | undefined;

    constructor(details: ApiErrorDetails) {
        super(MESSAGES_BY_CODE[details.code] ?? FALLBACK_MESSAGE);
        this.name = 'ApiError';
        this.status = details.status;
        this.code = details.code;
        this.fieldErrors = details.fieldErrors ?? {};
        this.retryAfterSeconds = details.retryAfterSeconds;
        this.requestId = details.requestId;
    }
}

function parseRetryAfter(value: unknown): number | undefined {
    const seconds = Number(value);

    return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

export function toApiError(error: unknown): ApiError {
    if (error instanceof ApiError) {
        return error;
    }

    if (!axios.isAxiosError<ErrorBody>(error) || error.response === undefined) {
        return new ApiError({ status: 0, code: 'NETWORK_ERROR' });
    }

    const { status, data, headers } = error.response;

    return new ApiError({
        status,
        code: data?.code ?? 'UNKNOWN_ERROR',
        fieldErrors: data?.errors ?? undefined,
        retryAfterSeconds: parseRetryAfter(headers['retry-after']),
        requestId: headers['x-request-id'] as string | undefined,
    });
}
