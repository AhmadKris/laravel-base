<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('department_id');
        });

        Schema::dropIfExists('departments');

        // The model class is gone, so a morph pointing at it would fail when the audit log is read.
        DB::table('activity_log')
            ->where('subject_type', 'App\\Modules\\Department\\Models\\Department')
            ->update(['subject_type' => null, 'subject_id' => null]);

        DB::table('permissions')->where('name', 'like', 'department.%')->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('parent_id')->nullable()->constrained('departments')->restrictOnDelete();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['parent_id', 'is_active']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('department_id')
                ->nullable()
                ->after('uuid')
                ->constrained('departments')
                ->restrictOnDelete();
        });
    }
};
