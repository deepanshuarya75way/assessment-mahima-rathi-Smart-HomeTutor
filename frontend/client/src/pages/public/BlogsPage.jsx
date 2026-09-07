import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';

export const BlogsPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/content/blogs');
      const data = await response.json();
      if (data.success && Array.isArray(data.blogs)) {
        setBlogs(data.blogs);
      } else {
        setBlogs([]);
      }
    } catch (err) {
      console.error('Error fetching blogs:', err);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  const defaultCover = 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80';

  const filteredBlogs = blogs.filter((blog) => {
    const query = searchQuery.trim().toLowerCase();
    return (
      !query ||
      (blog.title && blog.title.toLowerCase().includes(query)) ||
      (blog.excerpt && blog.excerpt.toLowerCase().includes(query)) ||
      (blog.category && blog.category.toLowerCase().includes(query)) ||
      (blog.tags && blog.tags.some((t) => t.toLowerCase().includes(query)))
    );
  });

  return (
    <div className="blogs-page-root">
      <Header activePage="blogs" />

      <main className="blogs-page-main">
        {/* Banner Section */}
        <section className="blogs-hero-section" style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '60px 0 50px 0',
          textAlign: 'center'
        }}>
          <div className="container">
            <span className="section-tag" style={{
              display: 'inline-block',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              padding: '6px 16px',
              borderRadius: '50px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '1px',
              marginBottom: '16px'
            }}>
              EDUCATIONAL INSIGHTS & RESOURCES
            </span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px', color: '#ffffff' }}>
              Smart HomeTutor Blog
            </h1>
            <p style={{ maxWidth: '650px', margin: '0 auto 30px auto', color: '#94a3b8', fontSize: '1.1rem', lineHeight: '1.6' }}>
              Explore expert academic advice, exam preparation strategies, and learning guides crafted by top educators.
            </p>

            {/* Search input */}
            <div style={{ maxWidth: '500px', margin: '0 auto', position: 'relative' }}>
              <i className="fa-solid fa-magnifying-glass" style={{
                position: 'absolute',
                left: '18px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b'
              }}></i>
              <input
                type="text"
                placeholder="Search articles by topic, title, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 20px 14px 48px',
                  borderRadius: '30px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#ffffff',
                  fontSize: '15px',
                  outline: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              />
            </div>
          </div>
        </section>

        {/* Filter Tabs & Content Section */}
        <section style={{ padding: '50px 0 80px 0', background: '#f8fafc', minHeight: '600px' }}>
          <div className="container">
            {/* Articles List / Grid */}
            {loading ? (
              <div className="blog-grid">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="blog-card blog-card-skeleton">
                    <div className="skeleton-img"></div>
                    <div className="skeleton-content">
                      <div className="skeleton-badge"></div>
                      <div className="skeleton-title"></div>
                      <div className="skeleton-text"></div>
                      <div className="skeleton-footer"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBlogs.length === 0 ? (
              <div className="blog-empty-state" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <i className="fa-solid fa-newspaper empty-icon" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }}></i>
                <h3 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '8px' }}>No Blog Articles Found</h3>
                <p style={{ color: '#64748b' }}>
                  {searchQuery ? `No articles matching "${searchQuery}".` : 'Our academic team is currently writing new articles. Please check back soon!'}
                </p>
              </div>
            ) : (
              <div className="blog-grid">
                {filteredBlogs.map((blog) => {
                  const formattedDate = blog.createdAt
                    ? new Date(blog.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '';
                  const coverSrc = blog.coverImage && blog.coverImage.trim() !== '' ? blog.coverImage : defaultCover;
                  const blogTarget = `/blog/${blog.slug || blog._id}`;

                  return (
                    <article key={blog._id} className="blog-card">
                      <Link to={blogTarget} className="blog-card-image-wrapper">
                        <img
                          src={coverSrc}
                          alt={blog.title}
                          className="blog-card-img"
                          onError={(e) => {
                            e.target.src = defaultCover;
                          }}
                        />
                        <span className="blog-category-badge">{blog.category || 'Learning Resources'}</span>
                      </Link>

                      <div className="blog-card-body">
                        <div className="blog-card-meta-top">
                          <span><i className="fa-regular fa-calendar"></i> {formattedDate}</span>
                          <span><i className="fa-regular fa-clock"></i> {blog.readTime || '5 min read'}</span>
                        </div>

                        <h3 className="blog-card-title">
                          <Link to={blogTarget}>{blog.title}</Link>
                        </h3>

                        <p className="blog-card-excerpt">
                          {blog.excerpt || (blog.content ? blog.content.substring(0, 120) + '...' : '')}
                        </p>

                        <div className="blog-card-footer">
                          <div className="blog-author-info">
                            <i className="fa-solid fa-user-pen author-icon"></i>
                            <span>{blog.author || 'Academic Team'}</span>
                          </div>

                          <Link to={blogTarget} className="blog-read-more">
                            Read Article <i className="fa-solid fa-arrow-right"></i>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
