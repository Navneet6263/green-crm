import { useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { getNotes } from '../../api/crm';
import type { Session } from '../../api/types';
import { useResource } from '../../hooks/useResource';
import { Button, Card, Empty, Notice, Pagination } from '../../ui/components';
import { when } from '../../ui/format';
import { colors, styles } from '../../ui/theme';

export function NoteHistory({ session, id, revision }: { session: Session; id: string; revision: number }) {
  const [page, setPage] = useState(1);
  const result = useResource(`notes:${session.user.user_id}:${id}:${page}:${revision}`, () => getNotes(session, id, page));
  return <><Text style={styles.heading}>CRM note history</Text>
    <Button title="Refresh note history" secondary onPress={result.reload} />
    {result.loading ? <ActivityIndicator color={colors.green} /> : result.error ? <Notice error message={result.error} />
      : result.data?.items.length ? result.data.items.map(note => <Card key={note.id}>
        <Text style={styles.body}>{note.content}</Text><Text style={styles.small}>{note.created_by_name || 'CRM user'} · {when(note.created_at)}</Text>
      </Card>) : <Empty title="No notes here yet" detail="Saved conversations will appear here." />}
    {result.data && <Pagination page={page} totalPages={result.data.totalPages} onChange={setPage} />}
  </>;
}
