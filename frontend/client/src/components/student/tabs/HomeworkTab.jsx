import React, { useState, useEffect } from 'react';
import { studentApi } from '../../../services/studentApi';

export const HomeworkTab = () => {
  const [tutors, setTutors] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  const [submittedHomeworks, setSubmittedHomeworks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tutorsRes, studyRes, submittedRes] = await Promise.all([
        studentApi.getMyTutors(),
        studentApi.getStudyMaterials(),
        studentApi.getSubmittedHomework(),
      ]);

      if (tutorsRes.success && Array.isArray(tutorsRes.tutors)) {
        setTutors(tutorsRes.tutors);
        if (tutorsRes.tutors.length > 0) {
          setSelectedTutor(tutorsRes.tutors[0]._id);
        }
      }

      if (studyRes.success) {
        setMaterials(studyRes.materials || []);
        setNotes(studyRes.notes || []);
      }

      if (submittedRes.success && Array.isArray(submittedRes.homeworks)) {
        setSubmittedHomeworks(submittedRes.homeworks);
      }
    } catch (err) {
      console.error('Load HomeworkTab Data Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHomeworkSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTutor) {
      setMsg('Please select a recipient tutor.');
      return;
    }
    if (!title.trim() || !subject.trim()) {
      setMsg('Homework Title and Subject are required.');
      return;
    }
    if (!file) {
      setMsg('Please attach a homework file.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setMsg('File size must be 25MB or less.');
      return;
    }

    setUploading(true);
    setMsg('');

    try {
      const formData = new FormData();
      formData.append('tutorId', selectedTutor);
      formData.append('title', title.trim());
      formData.append('subject', subject.trim());
      formData.append('description', description.trim());
      formData.append('file', file);

      const res = await studentApi.submitHomework(formData);
      if (res.success) {
        const targetTutorName = tutors.find((t) => t._id === selectedTutor)?.name || 'Tutor';
        setMsg(`Homework "${title}" submitted to ${targetTutorName} successfully!`);
        setTitle('');
        setSubject('');
        setDescription('');
        setFile(null);
        // Refresh submitted homeworks list
        const subRes = await studentApi.getSubmittedHomework();
        if (subRes.success && Array.isArray(subRes.homeworks)) {
          setSubmittedHomeworks(subRes.homeworks);
        }
      } else {
        setMsg(res.message || 'Homework submission failed.');
      }
    } catch (err) {
      console.error(err);
      setMsg('Homework submission failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const allNotes = [...notes, ...materials];

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      <div className="dash-card">
        <div className="dash-card-header">
          <h3>
            <i className="fa-solid fa-file-arrow-up"></i> Homework Submissions & Learning Materials
          </h3>
        </div>

        {msg && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '13.5px',
              fontWeight: '600',
              background: msg.includes('successfully') ? '#f0fdf4' : '#fef2f2',
              color: msg.includes('successfully') ? '#166534' : '#991b1b',
              border: `1px solid ${msg.includes('successfully') ? '#86efac' : '#fca5a5'}`,
            }}
          >
            {msg}
          </div>
        )}

        {/* SUBMIT HOMEWORK FORM */}
        <form onSubmit={handleHomeworkSubmit}>
          <div
            style={{
              padding: '24px',
              border: '2px dashed #cbd5e1',
              borderRadius: '16px',
              background: '#f8fafc',
              marginBottom: '28px',
            }}
          >
            <h4 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2a4a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-paper-plane" style={{ color: '#0284c7' }}></i> Submit Homework to Tutor
            </h4>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              Select your assigned tutor and attach your completed assignment file (PDF, DOCX, Images &bull; Max 25 MB).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Select Tutor *
                </label>
                <select
                  value={selectedTutor}
                  onChange={(e) => setSelectedTutor(e.target.value)}
                  className="tr-select"
                  required
                >
                  {tutors.length === 0 ? (
                    <option value="">No assigned tutors found</option>
                  ) : (
                    tutors.map((t) => {
                      const subjectDisplay = t.subject ? ` — ${t.subject}` : '';
                      return (
                        <option key={t._id} value={t._id}>
                          {t.name}{subjectDisplay}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Homework Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics Chapter 5 Homework"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="tr-input"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Subject *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="tr-input"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Description / Notes (Optional)
              </label>
              <textarea
                placeholder="Add any questions or instructions for your tutor..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="tr-textarea"
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Attach Homework File *
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setFile(e.target.files[0])}
                style={{ fontSize: '13px' }}
                required
              />
            </div>

            <button
              type="submit"
              className="dash-btn dash-btn-primary"
              disabled={uploading || !selectedTutor || !file}
            >
              {uploading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Submitting...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i> Submit Homework
                </>
              )}
            </button>
          </div>
        </form>

        {/* SUBMITTED HOMEWORK HISTORY */}
        <div style={{ marginBottom: '32px' }}>
          <div className="dash-card-header" style={{ marginBottom: '16px' }}>
            <h3>
              <i className="fa-solid fa-clock-rotate-left" style={{ color: '#0284c7' }}></i> My Submitted Homework History
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
              <i className="fa-solid fa-spinner fa-spin"></i> Loading homework submissions...
            </div>
          ) : submittedHomeworks.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600 }}>No Homework Submitted Yet</p>
              <small style={{ color: '#94a3b8' }}>Homework submitted to your tutors will be tracked here.</small>
            </div>
          ) : (
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>TITLE & SUBJECT</th>
                    <th>RECIPIENT TUTOR</th>
                    <th>SUBMISSION DATE</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {submittedHomeworks.map((hw) => (
                    <tr key={hw._id}>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{hw.title}</div>
                        <small style={{ color: '#64748b' }}>{hw.subject}</small>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f2a4a' }}>
                          {hw.tutor ? hw.tutor.name || 'Tutor' : 'Assigned Tutor'}
                        </div>
                        <small style={{ color: '#64748b' }}>{hw.tutor ? hw.tutor.email : ''}</small>
                      </td>
                      <td>
                        <small style={{ color: '#64748b' }}>
                          {new Date(hw.createdAt || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </small>
                      </td>
                      <td>
                        {hw.fileUrl ? (
                          <a
                            href={hw.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="dash-btn dash-btn-outline"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                          >
                            <i className="fa-solid fa-download"></i> Download File
                          </a>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>No File Attached</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* STUDY NOTES LIBRARY SECTION */}
        <div style={{ paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
          <div className="dash-card-header" style={{ marginBottom: '16px' }}>
            <h3>
              <i className="fa-solid fa-book-bookmark" style={{ color: '#0284c7' }}></i> Study Notes Library
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              <i className="fa-solid fa-spinner fa-spin"></i> Loading study notes...
            </div>
          ) : allNotes.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <i className="fa-solid fa-book-open" style={{ fontSize: '32px', color: '#cbd5e1', marginBottom: '10px', display: 'block' }}></i>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No Study Materials Uploaded Yet</p>
              <small style={{ color: '#94a3b8' }}>Study materials uploaded by your active tutors will appear here.</small>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {allNotes.map((item) => (
                <div key={item._id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#0f2a4a' }}>{item.title || item.fileName || 'Study Material'}</h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748b' }}>
                      Shared by: {item.tutor ? item.tutor.name || 'Tutor' : 'Tutor'}
                    </p>
                  </div>
                  <a
                    href={item.fileUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dash-btn dash-btn-primary"
                    style={{ fontSize: '12px', padding: '6px 12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <i className="fa-solid fa-download"></i> Download Material
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
