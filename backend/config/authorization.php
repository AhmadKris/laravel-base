<?php

declare(strict_types=1);

return [
    // Roles each role may grant to other users. "*" covers every role, including custom ones.
    // A role without an entry cannot grant any role.
    'assignable_roles' => [
        'Super Admin' => ['*'],
        'Admin' => ['Manager', 'Supervisor', 'Staff', 'Viewer'],
    ],
];
