<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->after('username');
            $table->string('avatar_path', 100)->nullable()->after('phone');
            // A new email waits here until the link sent to it is opened, so the login email never
            // changes to an address nobody has proven to own.
            $table->string('pending_email')->nullable()->after('email_verified_at');
            $table->char('pending_email_token', 64)->nullable()->after('pending_email');
            $table->timestamp('pending_email_expires_at')->nullable()->after('pending_email_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'avatar_path', 'pending_email', 'pending_email_token', 'pending_email_expires_at']);
        });
    }
};
