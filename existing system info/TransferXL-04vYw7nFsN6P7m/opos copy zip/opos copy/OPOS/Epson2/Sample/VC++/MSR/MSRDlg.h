// MSRDlg.h : header file
//
//{{AFX_INCLUDES()
#include "comsr.h"
//}}AFX_INCLUDES

#if !defined(AFX_MSRDLG_H__4FE4ECE7_A4F6_11D4_81DE_00402641B7F4__INCLUDED_)
#define AFX_MSRDLG_H__4FE4ECE7_A4F6_11D4_81DE_00402641B7F4__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

/////////////////////////////////////////////////////////////////////////////
// CMSRDlg dialog

class CMSRDlg : public CDialog
{
// Construction
public:
	CMSRDlg(CWnd* pParent = NULL);	// standard constructor

// Dialog Data
	//{{AFX_DATA(CMSRDlg)
	enum { IDD = IDD_MSR_DIALOG };
	CEdit	m_edtRetrieveSt;
	CCoMsr	m_Msr1;
	//}}AFX_DATA

	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CMSRDlg)
	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV support
	//}}AFX_VIRTUAL

// Implementation
protected:
	HICON m_hIcon;

	// Generated message map functions
	//{{AFX_MSG(CMSRDlg)
	virtual BOOL OnInitDialog();
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();
	afx_msg void OnClose();
	afx_msg void OnBtnRetrievSt();
	afx_msg void OnDataEventMsr1(long Status);
	afx_msg void OnErrorEventMsr1(long ResultCode, long ResultCodeExtended, long ErrorLocus, long FAR* pErrorResponse);
	DECLARE_EVENTSINK_MAP()
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
};

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_MSRDLG_H__4FE4ECE7_A4F6_11D4_81DE_00402641B7F4__INCLUDED_)
