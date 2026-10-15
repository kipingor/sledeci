<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\URL;
use Inertia\ResponseFactory;

class SettingsController extends Controller
{
    /**
     * Show the main settings dashboard.
     */
    public function index(ResponseFactory $inertia)
    {
        $sections = [
            [
                'title' => 'Profile',
                'href' => URL::route('profile.edit'),
                'description' => 'Update your profile information',
            ],
            [
                'title' => 'Password',
                'href' => URL::route('user-password.edit'),
                'description' => 'Change your account password',
            ],
            [
                'title' => 'Appearance',
                'href' => URL::route('appearance.edit'),
                'description' => 'Switch light/dark mode and customize appearance',
            ],
            [
                'title' => 'Two-Factor Authentication',
                'href' => URL::route('two-factor.show'),
                'description' => 'Manage two-factor authentication settings',
            ],
        ];

        return $inertia->render('settings/index', [
            'sections' => $sections,
        ]);
    }
}
