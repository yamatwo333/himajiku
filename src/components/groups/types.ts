export interface GroupDetail {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  notify_threshold: number;
  line_group_id: string | null;
}

export interface GroupSummary {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  notify_threshold?: number;
  member_count: number;
}

export interface GroupMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
}
