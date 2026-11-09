<?php

declare(strict_types=1);

return [
    // Roles each role may grant to other users. "*" covers every role, including custom ones.
    // A role without an entry cannot grant any role.
    'assignable_roles' => [
        'Super Admin' => ['*'],
        'Admin' => ['Manager', 'Supervisor', 'Staff', 'Viewer'],
    ],

    // Roles outside "unrestricted_roles" only reach configuration keys under "allowed_prefixes".
    'configuration_access' => [
        'unrestricted_roles' => ['Super Admin', 'System Admin'],
        'allowed_prefixes' => ['company.', 'localization.'],
    ],
];
