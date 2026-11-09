<?php

declare(strict_types=1);

namespace Tests\Fixtures\Models;

use App\Shared\Traits\HasOptimisticLock;
use App\Shared\Traits\HasPublicUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

final class SampleRecord extends Model
{
    use HasOptimisticLock;
    use HasPublicUuid;

    protected $table = 'sample_records';

    protected $fillable = ['name'];

    public static function createTable(): void
    {
        self::dropTable();

        Schema::create('sample_records', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
    }

    public static function dropTable(): void
    {
        Schema::dropIfExists('sample_records');
    }
}
