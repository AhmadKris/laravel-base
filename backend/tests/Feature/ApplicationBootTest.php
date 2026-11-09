<?php

declare(strict_types=1);

it('boots the application', function () {
    $this->get('/up')->assertOk();
});
