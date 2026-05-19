#if !defined(AFX_OUTPUTCOMPLETEDIALOG_H__BC41C2CF_1C5F_4B25_ACB9_CBFB23FBD38A__INCLUDED_)
#define AFX_OUTPUTCOMPLETEDIALOG_H__BC41C2CF_1C5F_4B25_ACB9_CBFB23FBD38A__INCLUDED_

#if _MSC_VER > 1000
#pragma once
#endif // _MSC_VER > 1000
// OutputCompleteDialog.h : header file
//

/////////////////////////////////////////////////////////////////////////////
// COutputCompleteDialog dialog

class COutputCompleteDialog : public CDialog
{
// Construction
public:
	void SetMessage(CString strMsg);
	COutputCompleteDialog(CWnd* pParent = NULL);    // standard constructor

// Dialog Data
	//{{AFX_DATA(COutputCompleteDialog)
	enum { IDD = IDD_OUTPUTCOMPLETE };
	//}}AFX_DATA


// Overrides
	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(COutputCompleteDialog)
	public:
	virtual BOOL Create();
	protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV support
	virtual void PostNcDestroy();
	//}}AFX_VIRTUAL

// Implementation
protected:

	// Generated message map functions
	//{{AFX_MSG(COutputCompleteDialog)
	virtual void OnOK();
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()

	CWnd* m_pParent;
	int m_nID;

};

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_OUTPUTCOMPLETEDIALOG_H__BC41C2CF_1C5F_4B25_ACB9_CBFB23FBD38A__INCLUDED_)
