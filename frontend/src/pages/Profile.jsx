import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { User, Mail, MessageSquare, ArrowUp, ArrowDown, Hash, Calendar, Star } from 'lucide-react';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [recentComments, setRecentComments] = useState([]);
  const [recentVotes, setRecentVotes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [stats, setStats] = useState({ totalComments: 0, totalUpvotes: 0, totalDownvotes: 0, commentScore: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUser(user);

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setProfile(profileData);

      // Fetch topics
      const { data: topicsData } = await supabase
        .from('topics')
        .select('*')
        .eq('user_id', user.id);
      setTopics(topicsData || []);

      // Fetch recent comments with article title
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, articles(title, link)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentComments(commentsData || []);

      // Fetch recent article votes
      const { data: votesData } = await supabase
        .from('votes')
        .select('*, articles(title, link)')
        .eq('user_id', user.id)
        .neq('vote_value', 0)
        .order('id', { ascending: false })
        .limit(5);
      setRecentVotes(votesData || []);

      // Aggregate stats
      const { count: totalComments } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { data: allVotes } = await supabase
        .from('votes')
        .select('vote_value')
        .eq('user_id', user.id);

      const upvotes = allVotes?.filter(v => v.vote_value === 1).length || 0;
      const downvotes = allVotes?.filter(v => v.vote_value === -1).length || 0;

      // Comment karma: sum of (upvotes - downvotes) on own comments
      const { data: commentVoteData } = await supabase
        .from('comments')
        .select('upvotes, downvotes')
        .eq('user_id', user.id);
      const commentScore = commentVoteData?.reduce((sum, c) => sum + (c.upvotes || 0) - (c.downvotes || 0), 0) || 0;

      setStats({ totalComments: totalComments || 0, totalUpvotes: upvotes, totalDownvotes: downvotes, commentScore });
      setLoading(false);
    });
  }, []);

  const avatarLetter = profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';
  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '';

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading profile...</div>
    </div>
  );

  return (
    <div className="container" style={{ maxWidth: '900px' }}>

      {/* Header Card */}
      <div className="glass-panel" style={{ padding: '36px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '28px', background: 'linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(59,130,246,0.08) 100%)' }}>
        {/* Avatar */}
        <div style={{
          width: '90px', height: '90px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem', fontWeight: 'bold', color: 'white',
          boxShadow: '0 4px 20px rgba(79,70,229,0.35)'
        }}>
          {avatarLetter}
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '1.8rem', color: '#0f172a' }}>
            {profile?.username || user?.email?.split('@')[0]}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '6px', fontSize: '0.95rem' }}>
            <Mail size={15} />
            {user?.email}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Calendar size={14} />
            Member since {joinDate}
          </div>
        </div>

        {/* Karma Score */}
        <div style={{ textAlign: 'center', padding: '16px 24px', background: 'rgba(79,70,229,0.1)', borderRadius: '12px', border: '1px solid rgba(79,70,229,0.2)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4f46e5', lineHeight: 1 }}>{stats.commentScore >= 0 ? '+' : ''}{stats.commentScore}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
            <Star size={12} /> Karma
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { icon: <MessageSquare size={20} color="#6366f1" />, label: 'Comments', value: stats.totalComments, color: '#6366f1' },
          { icon: <ArrowUp size={20} color="#f97316" />, label: 'Upvotes Given', value: stats.totalUpvotes, color: '#f97316' },
          { icon: <ArrowDown size={20} color="#3b82f6" />, label: 'Downvotes Given', value: stats.totalDownvotes, color: '#3b82f6' },
          { icon: <Hash size={20} color="#10b981" />, label: 'Topics Tracked', value: topics.length, color: '#10b981' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>{icon}</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 'bold', color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* Recent Comments */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="var(--primary)" /> Recent Comments
          </h3>
          {recentComments.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No comments yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {recentComments.map(c => (
              <div key={c.id} style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '12px' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>"{c.content}"</p>
                <a href={c.articles?.link} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none' }}>
                  ↗ {c.articles?.title?.slice(0, 55)}{c.articles?.title?.length > 55 ? '...' : ''}
                </a>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '10px' }}>
                  <span>👍 {c.upvotes || 0}</span>
                  <span>👎 {c.downvotes || 0}</span>
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Votes */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowUp size={18} color="var(--primary)" /> Recent Votes
          </h3>
          {recentVotes.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No votes cast yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {recentVotes.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{
                  flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%',
                  background: v.vote_value === 1 ? 'rgba(249,115,22,0.12)' : 'rgba(59,130,246,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {v.vote_value === 1
                    ? <ArrowUp size={16} color="#f97316" />
                    : <ArrowDown size={16} color="#3b82f6" />}
                </div>
                <a href={v.articles?.link} target="_blank" rel="noreferrer" style={{ fontSize: '0.88rem', color: '#334155', textDecoration: 'none', lineHeight: 1.4 }}>
                  {v.articles?.title?.slice(0, 65)}{v.articles?.title?.length > 65 ? '...' : ''}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Tracked Topics */}
        <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Hash size={18} color="var(--primary)" /> Topics I Track
          </h3>
          {topics.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No topics added yet. Go to Preferences to add some!</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {topics.map(t => (
              <span key={t.id} style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600',
                background: 'rgba(79,70,229,0.1)', color: '#4f46e5', border: '1px solid rgba(79,70,229,0.2)'
              }}>
                # {t.keyword}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
