// HTotalsDlg.h : implementation file
//
//{{AFX_INCLUDES()
#include "cotot.h"
//}}AFX_INCLUDES

#if !defined(AFX_HTOTALSDLG_H__DF6DD168_A442_11D4_81DE_00402641B7F4__INCLUDED_)
#define AFX_HTOTALSDLG_H__DF6DD168_A442_11D4_81DE_00402641B7F4__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

/////////////////////////////////////////////////////////////////////////////
// CHTotalsDlg dialog

class CHTotalsDlg : public CDialog
{
// Construction
public:
	CHTotalsDlg(CWnd* pParent = NULL);	// standard constructor

// Dialog Data
	//{{AFX_DATA(CHTotalsDlg)
	enum { IDD = IDD_HTOTALS_DIALOG };
	CEdit	m_edtRetrieveSt;
	CString	m_ListFile;
	CString	m_CreateFile;
	CString	m_Register;
	CString	m_Change;
	CCoTot	m_Totals1;
	//}}AFX_DATA

	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CHTotalsDlg)
	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV support
	//}}AFX_VIRTUAL

// Implementation
protected:
	HICON m_hIcon;

	// Generated message map functions
	//{{AFX_MSG(CHTotalsDlg)
	virtual BOOL OnInitDialog();
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();
	afx_msg void OnClose();
	afx_msg void OnBtnCreate();
	afx_msg void OnBtnChange();
	afx_msg void OnBtnDelete();
	afx_msg void OnBtnRegister();
	afx_msg void OnSelchangeListFile();
	afx_msg void OnBtnRetrievSt();
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
private:
	void ListRefresh();
};

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_HTOTALSDLG_H__DF6DD168_A442_11D4_81DE_00402641B7F4__INCLUDED_)
