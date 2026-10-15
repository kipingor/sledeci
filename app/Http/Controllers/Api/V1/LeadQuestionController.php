<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lead\StoreLeadQuestionRequest;
use App\Models\Lead;
use App\Models\LeadQuestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadQuestionController extends Controller
{
    /**
     * Get all questions for a lead.
     */
    public function index(Lead $lead): JsonResponse
    {
        $questions = $lead->questions()->with('user')->latest()->get();

        return response()->json(['data' => $questions]);
    }

    /**
     * Store a new question for a lead.
     */
    public function store(StoreLeadQuestionRequest $request): JsonResponse
    {
        $question = LeadQuestion::create([
            'lead_id' => $request->input('lead_id'),
            'question' => $request->input('question'),
            'answer' => $request->input('answer'),
            'is_ai_generated' => $request->input('is_ai_generated', false),
            'asked_by' => $request->user()->id,
        ]);

        activity()
            ->performedOn($question->lead)
            ->causedBy($request->user())
            ->log("Question added: {$question->question}");

        return response()->json([
            'message' => 'Question created successfully',
            'data' => $question->load('user'),
        ], 201);
    }

    /**
     * Update a question answer.
     */
    public function update(LeadQuestion $question, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'answer' => 'required|string',
        ]);

        $question->update([
            'answer' => $validated['answer'],
            'answered' => true,
        ]);

        activity()
            ->performedOn($question->lead)
            ->causedBy($request->user())
            ->log("Question answered: {$question->question}");

        return response()->json([
            'message' => 'Question updated successfully',
            'data' => $question,
        ]);
    }

    /**
     * Delete a question.
     */
    public function destroy(LeadQuestion $question, Request $request): JsonResponse
    {
        $question->delete();

        activity()
            ->performedOn($question->lead)
            ->causedBy($request->user())
            ->log("Question deleted: {$question->question}");

        return response()->json(['message' => 'Question deleted successfully']);
    }
}
