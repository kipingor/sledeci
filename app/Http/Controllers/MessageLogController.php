<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMessageLogRequest;
use App\Http\Requests\UpdateMessageLogRequest;
use App\Models\MessageLog;

class MessageLogController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreMessageLogRequest $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(MessageLog $messageLog)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(MessageLog $messageLog)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateMessageLogRequest $request, MessageLog $messageLog)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(MessageLog $messageLog)
    {
        //
    }
}
