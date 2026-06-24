import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { ArrowUp, ArrowDown, Edit2, Trash2, Check, X } from 'lucide-react';

export default function Comments({ articleId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        fetchUserVotes(user);
      }
    });
    fetchComments();
  }, [articleId]);

  const fetchComments = async () => {
    const res = await fetch(`http://localhost:8000/api/articles/${articleId}/comments`);
    if (res.ok) {
      setComments(await res.json());
    }
  };

  const fetchUserVotes = async (user) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`http://localhost:8000/api/articles/${articleId}/comment_votes`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (res.ok) {
      setUserVotes(await res.json());
    }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`http://localhost:8000/api/articles/${articleId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ content: newComment })
      });
      
      if (res.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (e) {
      alert("Error posting comment.");
    }
    setLoading(false);
  };

  const deleteComment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`http://localhost:8000/api/comments/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (res.ok) fetchComments();
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditContent(c.content);
  };

  const saveEdit = async (id) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`http://localhost:8000/api/comments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ content: editContent })
    });
    if (res.ok) {
      setEditingId(null);
      fetchComments();
    }
  };

  const handleVote = async (commentId, targetVote) => {
    if (!currentUser) {
      alert("You must be logged in to vote.");
      return;
    }
    
    const currentVote = userVotes[commentId] || 0;
    let newVote = targetVote;
    if (currentVote === targetVote) newVote = 0; // Clicking an active vote toggles it off
    
    setUserVotes({ ...userVotes, [commentId]: newVote });
    
    setComments(comments.map(c => {
      if (c.id === commentId) {
        let newUp = c.upvotes || 0;
        let newDown = c.downvotes || 0;
        if (currentVote === 1) newUp -= 1;
        if (currentVote === -1) newDown -= 1;
        
        if (newVote === 1) newUp += 1;
        if (newVote === -1) newDown += 1;
        
        return { ...c, upvotes: newUp, downvotes: newDown, score: newUp - newDown };
      }
      return c;
    }));

    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`http://localhost:8000/api/comments/${commentId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ vote_value: newVote })
    });
  };

  return (
    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
      <h4 style={{ margin: '0 0 15px 0' }}>Community Discussion</h4>
      
      {currentUser ? (
        <form onSubmit={postComment} style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="What are your thoughts?" 
            value={newComment} 
            onChange={(e) => setNewComment(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            Post
          </button>
        </form>
      ) : (
        <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', color: '#64748b' }}>
          Please log in to participate in the discussion.
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
        {comments.map(c => {
          const isOwner = currentUser && c.user_id === currentUser.id;
          const isAdmin = currentUser && currentUser.email === "atharvconsul@gmail.com";
          const vote = userVotes[c.id] || 0;

          return (
            <div key={c.id} style={{ display: 'flex', gap: '12px' }}>
              
              {/* Vote Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0, marginTop: '2px' }}>
                <button 
                  onClick={() => handleVote(c.id, 1)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: vote === 1 ? '#f97316' : '#cbd5e1', padding: '2px' }}
                >
                  <ArrowUp size={20} />
                </button>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: vote !== 0 ? (vote === 1 ? '#f97316' : '#8b5cf6') : '#94a3b8' }}>
                  {c.score}
                </span>
                <button 
                  onClick={() => handleVote(c.id, -1)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: vote === -1 ? '#8b5cf6' : '#cbd5e1', padding: '2px' }}
                >
                  <ArrowDown size={20} />
                </button>
              </div>

              {/* Avatar */}
              <div style={{
                width: '35px', height: '35px', borderRadius: '50%', background: 'var(--primary)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}>
                {c.avatar_initial}
              </div>
              
              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{c.username} <span style={{ fontWeight: 'normal', color: '#94a3b8' }}>&bull; {new Date(c.created_at).toLocaleDateString()}</span></span>
                  
                  {/* Action Buttons */}
                  {(isOwner || isAdmin) && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {isOwner && (
                        <button onClick={() => startEdit(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} title="Edit">
                          <Edit2 size={14} />
                        </button>
                      )}
                      <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title={isAdmin && !isOwner ? "Delete as Admin" : "Delete"}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {editingId === c.id ? (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editContent} 
                      onChange={(e) => setEditContent(e.target.value)} 
                      style={{ flex: 1, padding: '6px' }}
                    />
                    <button onClick={() => saveEdit(c.id)} className="btn-primary" style={{ padding: '6px 10px' }}><Check size={16}/></button>
                    <button onClick={() => setEditingId(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}><X size={16}/></button>
                  </div>
                ) : (
                  <div style={{ color: '#0f172a', lineHeight: 1.4, wordBreak: 'break-word', marginTop: '4px' }}>
                    {c.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {comments.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>No comments yet. Be the first to start the discussion!</p>}
      </div>
    </div>
  );
}
