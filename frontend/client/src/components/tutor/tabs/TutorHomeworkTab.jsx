import React, { useState, useEffect } from 'react';

export const TutorHomeworkTab = () => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [file, setFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Received Student Homework State
  const [receivedHomeworks, setReceivedHomeworks] = useState([]);
  const [loadingHomeworks, setLoadingHomeworks] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingStudents(true);
    setLoadingHomeworks(true);

    try {
      // Fetch assigned students
      const studentsRes = await fetch('/api/tutor/my-students');
      const studentsData = await studentsRes.json();
      if (studentsData.success && Array.isArray(studentsData.students)) {
        setStudents(studentsData.students);
        if (studentsData.students.length > 0) {
          setSelectedStudent(studentsData.students[0]._id);
        }
      }

      // Fetch received student homeworks (delivered ONLY to this tutor)
      const hwRes = await fetch('/api/tutor/received-homework');
      const hwData = await hwRes.json();
      if (hwData.success && Array.isArray(hwData.homeworks)) {
        setReceivedHomeworks(hwData.homeworks);
      }
    } catch (err) {
      console.error('Fetch Tutor Homework Data Error:', err);
    } finally {
      setLoadingStudents(false);
      setLoadingHomeworks(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 50 * 1024 * 1024) {
        setMessage({ text: 'File size must be 50MB or less.', type: 'error' });
        e.target.value = '';
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setMessage({ text: '', type: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !subject || !className || !file || !selectedStudent) {
      setMessage({ text: 'Please fill all required fields, select a recipient student, and attach a file.', type: 'error' });
      return;
    }

    setUploading(true);
    setMessage({ text: '', type: '' });

    const formData = new FormData();
    formData.append('title', title);
    formData.append('subject', subject);
    formData.append('class', className);
    formData.append('student', selectedStudent);
    formData.append('note', file);

    try {
      const res = await fetch('/api/tutor/upload-note', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const targetStName = students.find((s) => s._id === selectedStudent)?.name || 'Selected Student';
        setMessage({ text: `Study Notes uploaded and shared with ${targetStName} successfully!`, type: 'success' });
        setTitle('');
        setSubject('');
        setClassName('');
        setFile(null);
      } else {
        setMessage({ text: data.message || 'Upload failed.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Server error uploading note. Please try again.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      <div className="dash-card">
        <div className="dash-card-header">
          <h3>
            <i className="fa-solid fa-file-arrow-up"></i> Homework & Study Notes Workspace
          </h3>
        </div>

        {message.text && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '14px',
              fontWeight: '600',
              background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: message.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
            }}
          >
            {message.text}
          </div>
        )}

        {/* SECTION 1: RECEIVED STUDENT HOMEWORK */}
        <div style={{ marginBottom: '32px' }}>
          <div className="dash-card-header" style={{ marginBottom: '16px' }}>
            <h3>
              <i className="fa-solid fa-inbox" style={{ color: '#0284c7' }}></i> Received Student Homework Submissions
            </h3>
            <button
              type="button"
              className="dash-btn dash-btn-outline"
              onClick={fetchData}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <i className="fa-solid fa-rotate"></i> Refresh
            </button>
          </div>

          {loadingHomeworks ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              <i className="fa-solid fa-spinner fa-spin"></i> Loading received homework...
            </div>
          ) : receivedHomeworks.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <i className="fa-solid fa-folder-open" style={{ fontSize: '28px', color: '#cbd5e1', marginBottom: '8px', display: 'block' }}></i>
              <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600 }}>No Homework Submissions Received Yet</p>
              <small style={{ color: '#94a3b8' }}>Homework submitted by your students will appear here exclusively for you.</small>
            </div>
          ) : (
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>STUDENT NAME & EMAIL</th>
                    <th>HOMEWORK TITLE & SUBJECT</th>
                    <th>SUBMISSION DATE</th>
                    <th>ATTACHED FILE</th>
                  </tr>
                </thead>
                <tbody>
                  {receivedHomeworks.map((hw) => (
                    <tr key={hw._id}>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f2a4a' }}>
                          {hw.student ? hw.student.name || 'Student' : 'Student Account'}
                        </div>
                        <small style={{ color: '#64748b' }}>{hw.student ? hw.student.email : 'N/A'}</small>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{hw.title}</div>
                        <small style={{ color: '#64748b' }}>{hw.subject} {hw.description ? `• ${hw.description}` : ''}</small>
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
                            className="dash-btn dash-btn-primary"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                          >
                            <i className="fa-solid fa-download"></i> Download Homework
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

        {/* SECTION 2: UPLOAD STUDY NOTES & ASSIGNMENTS FOR STUDENT */}
        <div style={{ paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
          <div className="dash-card-header" style={{ marginBottom: '16px' }}>
            <h3>
              <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#0284c7' }}></i> Upload & Share Study Notes with Student
            </h3>
          </div>

          <form onSubmit={handleSubmit}>
            <div
              style={{
                padding: '24px',
                border: '2px dashed #cbd5e1',
                borderRadius: '16px',
                background: '#f8fafc',
                marginBottom: '20px',
              }}
            >
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
                Upload PDF, DOCX or ZIP files to share study notes with a specific student (Max 50 MB).
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px',
                  marginBottom: '16px',
                  textAlign: 'left',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Select Student *
                  </label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="tr-select"
                    required
                  >
                    {loadingStudents ? (
                      <option value="">Loading assigned students...</option>
                    ) : students.length === 0 ? (
                      <option value="">No assigned students found</option>
                    ) : (
                      students.map((st) => (
                        <option key={st._id} value={st._id}>
                          {st.name} ({st.email})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Organic Chemistry Chapter 3 Notes"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="tr-input"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chemistry"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="tr-input"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Class / Grade *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Class 12 CBSE"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="tr-input"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.zip"
                  onChange={handleFileChange}
                  style={{ padding: '8px', fontSize: '13px' }}
                  required
                />
              </div>

              <button type="submit" className="dash-btn dash-btn-primary" disabled={uploading || !selectedStudent}>
                {uploading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Uploading Note...
                  </>
                ) : (
                  'Upload & Share with Selected Student'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
