// MICRDlg.h : implementation file
//
//{{AFX_INCLUDES()
#include "coptr.h"
#include "comicr.h"
//}}AFX_INCLUDES

#if !defined(AFX_MICRDLG_H__AD5DC9C7_A454_11D4_81DE_00402641B7F4__INCLUDED_)
#define AFX_MICRDLG_H__AD5DC9C7_A454_11D4_81DE_00402641B7F4__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

/////////////////////////////////////////////////////////////////////////////
// CMICRDlg dialog

class CMICRDlg : public CDialog
{
// Construction
public:
	CMICRDlg(CWnd* pParent = NULL);	// standard constructor

// Dialog Data
	//{{AFX_DATA(CMICRDlg)
	enum { IDD = IDD_MICR_DIALOG };
	CEdit	m_edtRetrieveSt;
	CCoMicr	m_Micr1;
	CCoPtr	m_Ptr1;
	//}}AFX_DATA

	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CMICRDlg)
	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV support
	//}}AFX_VIRTUAL

// Implementation
protected:
	HICON m_hIcon;

	// Generated message map functions
	//{{AFX_MSG(CMICRDlg)
	virtual BOOL OnInitDialog();
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();
	afx_msg void OnClose();
	afx_msg void OnBtnInsert();
	afx_msg void OnBtnPrint();
	afx_msg void OnBtnRemove();
	afx_msg void OnBtnRetrievSt();
	afx_msg void OnDataEventMicr1(long Status);
	afx_msg void OnErrorEventMicr1(long ResultCode, long ResultCodeExtended, long ErrorLocus, long FAR* pErrorResponse);
	afx_msg void OnStatusUpdateEventMicr1(long Data);
	DECLARE_EVENTSINK_MAP()
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
};

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_MICRDLG_H__AD5DC9C7_A454_11D4_81DE_00402641B7F4__INCLUDED_)
