-- Create optimized function to get unread message counts for all rooms in a single query
-- This replaces the N+1 query pattern where we count messages for each room separately

CREATE OR REPLACE FUNCTION public.get_unread_counts_by_room(
  p_user_id UUID,
  p_rooms JSONB -- Array of {room_id, last_read_at}
)
RETURNS TABLE(room_id UUID, unread_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.room_id::UUID,
    COALESCE(COUNT(m.id), 0)::BIGINT as unread_count
  FROM jsonb_to_recordset(p_rooms) AS r(room_id UUID, last_read_at TIMESTAMPTZ)
  LEFT JOIN room_chat_messages m ON m.room_id = r.room_id
    AND m.created_at > COALESCE(r.last_read_at, '1970-01-01'::timestamptz)
    AND m.user_id != p_user_id
  GROUP BY r.room_id;
END;
$$;