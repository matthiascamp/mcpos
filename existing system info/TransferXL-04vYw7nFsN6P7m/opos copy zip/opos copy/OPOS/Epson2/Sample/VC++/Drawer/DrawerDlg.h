// DrawerDlg.h : implementation file
//
//{{AFX_INCLUDES()
#include "cocash.h"
//}}AFX_INCLUDES

#if !defined(AFX_DRAWERDLG_H__D9EF83A7_A43D_11D4_81DE_00402641B7F4__INCLUDED_)
#define AFX_DRAWERDLG_H__D9EF83A7_A43D_11D4_81DE_00402641B7F4__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

/////////////////////////////////////////////////////////////////////////////
// CDrawerDlg dialog

class CDrawerDlg : public CDialog
{
// Construction
public:
	CDrawerDlg(CWnd* pParent = NULL);	// standard constructor

// Dialog Data
	//{{AFX_DATA(CDrawerDlg)
	enum { IDD = IDD_DRAWER_DIALOG };
	CEdit	m_edtRetrieveSt;
	CCoCash	m_Cash1;
	//}}AFX_DATA

	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CDrawerDlg)
	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV support
	//}}AFX_VIRTUAL

// Implementation
protected:
	HICON m_hIcon;

	// Generated message map functions
	//{{AFX_MSG(CDrawerDlg)
	virtual BOOL OnInitDialog();
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();
	afx_msg void OnClose();
	afx_msg void OnBtnOpen();
	afx_msg void OnBtnRetrievSt();
	afx_msg void OnStatusUpdateEventCashdrawer1(long Data);
	DECLARE_EVENTSINK_MAP()
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
};

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_DRAWERDLG_H__D9EF83A7_A43D_11D4_81DE_00402641B7F4__INCLUDED_)
