#if !defined(AFX_ERRORDIALOG_H__55FFF44F_53FA_4F47_AA64_66F9DA7F2CE6__INCLUDED_)
#define AFX_ERRORDIALOG_H__55FFF44F_53FA_4F47_AA64_66F9DA7F2CE6__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000
// ErrorDialog.h : header file
//

/////////////////////////////////////////////////////////////////////////////
// CErrorDialog dialog

class CErrorDialog : public CDialog
{
// Construction
public:
public:
	bool m_bSuspendButtonEnabled;
	bool m_bRetryButtonEnabled;
	bool m_bCancelButtonEnabled;
	CString m_strCancelButtonCaption;
	CString m_strRetryButtonCaption;
	CString m_strSuspendButtonCaption;
	CString	m_strErrorMessage;

	CErrorDialog(CWnd* pParent = NULL);   // standard constructor

	enum ERROR_RECOVERY_TYPE
	{
		ER_CANCEL,
		ER_RETRY,
		ER_SUSPEND
	};

	ERROR_RECOVERY_TYPE m_lErrorRecovery;

protected:

// Dialog Data
	//{{AFX_DATA(CErrorDialog)
	enum { IDD = IDD_ERROR_DIALOG };
	//}}AFX_DATA


// Overrides
	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CErrorDialog)
	public:
	virtual int DoModal();
	protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV support
	//}}AFX_VIRTUAL

// Implementation
protected:

	// Generated message map functions
	//{{AFX_MSG(CErrorDialog)
	afx_msg void OnButtonRetry();
	afx_msg void OnButtonSuspend();
	afx_msg void OnButtonCancel();
	virtual BOOL OnInitDialog();
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()

protected:
};

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_ERRORDIALOG_H__55FFF44F_53FA_4F47_AA64_66F9DA7F2CE6__INCLUDED_)
