import { NextResponse } from 'next/server';
import { fetchGrantsGovDetail } from '@/lib/providers/grantsGov';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id.startsWith('grants-')) return NextResponse.json({ error: 'Detailed view is not available for this source yet.' }, { status: 404 });
  try {
    const opportunity = await fetchGrantsGovDetail(id.replace(/^grants-/, ''));
    return NextResponse.json({ opportunity });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to load opportunity details.', detail: String(error) }, { status: 502 });
  }
}
