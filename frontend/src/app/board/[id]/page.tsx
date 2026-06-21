'use client'

import React, {use} from 'react';
import { useSearchParams } from 'next/navigation';
import Whiteboard from "@a/components/canvas/Whiteboard"

interface PageProps {
    params: Promise<{id: string}>;
}

export default function BoardPage({params}: PageProps){
    const resolvedParams = use(params);
    const searchParamas = useSearchParams();

    const boardId = resolvedParams.id;
    const username = searchParamas.get('name') || 'Anonymus';

    return <Whiteboard boardId={boardId} username={username}/>
}