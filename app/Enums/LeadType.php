<?php

namespace App\Enums;

enum LeadType: string
{
    case DOCUMENT = 'document';
    case CONVERSATION = 'conversation';

    /**
     * Get human-readable label for the lead type
     */
    public function label(): string
    {
        return match($this) {
            self::DOCUMENT => 'Document-based Lead',
            self::CONVERSATION => 'Conversation-based Lead',
        };
    }

    /**
     * Get short label
     */
    public function shortLabel(): string
    {
        return match($this) {
            self::DOCUMENT => 'Document',
            self::CONVERSATION => 'Conversation',
        };
    }

    /**
     * Get icon name for UI representation
     */
    public function icon(): string
    {
        return match($this) {
            self::DOCUMENT => 'file-text',
            self::CONVERSATION => 'message-circle',
        };
    }

    /**
     * Get color for visual representation
     */
    public function color(): string
    {
        return match($this) {
            self::DOCUMENT => 'blue',
            self::CONVERSATION => 'green',
        };
    }

    /**
     * Check if lead type requires document upload
     */
    public function requiresDocument(): bool
    {
        return $this === self::DOCUMENT;
    }

    /**
     * Check if lead type supports AI extraction
     */
    public function supportsAiExtraction(): bool
    {
        return $this === self::DOCUMENT;
    }

    /**
     * Get allowed file types for this lead type
     */
    public function allowedFileTypes(): array
    {
        return match($this) {
            self::DOCUMENT => ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'],
            self::CONVERSATION => [], // No file uploads for conversation
        };
    }

    /**
     * Get description for help text
     */
    public function description(): string
    {
        return match($this) {
            self::DOCUMENT => 'Lead generated from uploaded documents (RFPs, proposals, contracts, etc.)',
            self::CONVERSATION => 'Lead generated from direct conversations (emails, calls, meetings, etc.)',
        };
    }
}