// KeylockDlg.h : implementation file
//
//{{AFX_INCLUDES()
#include "colock.h"
//}}AFX_INCLUDES

#if !defined(AFX_KEYLOCKDLG_H__AC9CE227_A501_11D4_81DE_00402641B7F4__INCLUDED_)
#define AFX_KEYLOCKDLG_H__AC9CE227_A501_11D4_81DE_00402641B7F4__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

/////////////////////////////////////////////////////////////////////////////
// CKeylockDlg dialog

class CKeylockDlg : public CDialog
{
// Construction
public:
	CKeylockDlg(CWnd* pParent = NULL);	// standard constructor

// Dialog Data
	//{{AFX_DATA(CKeylockDlg)
	enum { IDD = IDD_KEYLOCK_DIALOG };
	CEdit	m_edtRetrieveSt;
	CCoLock	m_Lock1;
	//}}AFX_DATA

	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CKeylockDlg)
	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV support
	//}}AFX_VIRTUAL

// Implementation
protected:
	HICON m_hIcon;

	// Generated message map functions
	//{{AFX_MSG(CKeylockDlg)
	virtual BOOL OnInitDialog();
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();
	afx_msg void OnClose();
	afx_msg void OnBtnKeyposi();
	afx_msg void OnBtnRetrievSt();
	afx_msg void OnStatusUpdateEventKeylock1(long Data);
	DECLARE_EVENTSINK_MAP()
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
};

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_KEYLOCKDLG_H__AC9CE227_A501_11D4_81DE_00402641B7F4__INCLUDED_)
