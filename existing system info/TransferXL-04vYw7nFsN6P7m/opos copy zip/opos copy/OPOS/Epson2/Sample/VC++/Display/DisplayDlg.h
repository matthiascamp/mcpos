// DisplayDlg.h : header file
//
//{{AFX_INCLUDES()
#include "codisp.h"
//}}AFX_INCLUDES

#if !defined(AFX_DISPLAYDLG_H__62F69DC7_A42D_11D4_81DE_00402641B7F4__INCLUDED_)
#define AFX_DISPLAYDLG_H__62F69DC7_A42D_11D4_81DE_00402641B7F4__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

/////////////////////////////////////////////////////////////////////////////
// CDisplayDlg dialog

class CDisplayDlg : public CDialog
{
// Construction
public:
	CDisplayDlg(CWnd* pParent = NULL);	// standard constructor

// Dialog Data
	//{{AFX_DATA(CDisplayDlg)
	enum { IDD = IDD_DISPLAY_DIALOG };
	CEdit	m_edtRetrieveSt;
	CString	m_EditField;
	CCoDisp	m_Disp1;
	//}}AFX_DATA

	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CDisplayDlg)
	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV support
	//}}AFX_VIRTUAL

// Implementation
protected:
	HICON m_hIcon;

	// Generated message map functions
	//{{AFX_MSG(CDisplayDlg)
	virtual BOOL OnInitDialog();
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();
	afx_msg void OnBtnClear();
	afx_msg void OnBtnPosition();
	afx_msg void OnBtnBlink();
	afx_msg void OnBtnTeletype();
	afx_msg void OnBtnControl();
	afx_msg void OnBtnScleft();
	afx_msg void OnBtnScright();
	afx_msg void OnBtnOrnaments();
	afx_msg void OnBtnBitmap();
	afx_msg void OnClose();
	afx_msg void OnBtnDefineglyph();
	afx_msg void OnBtnReadcharacter();
	afx_msg void OnBtnRetrievSt();
	afx_msg void OnStatusUpdateEventLinedisplay1(long Data);
	DECLARE_EVENTSINK_MAP()
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
};

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_DISPLAYDLG_H__62F69DC7_A42D_11D4_81DE_00402641B7F4__INCLUDED_)
