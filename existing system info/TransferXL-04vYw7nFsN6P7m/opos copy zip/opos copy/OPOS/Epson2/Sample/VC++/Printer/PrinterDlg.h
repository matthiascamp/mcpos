// PrinterDlg.h : implementation file
//
//{{AFX_INCLUDES()
#include "coptr.h"
//}}AFX_INCLUDES

#if !defined(AFX_PRINTERDLG_H__20B34808_A121_11D4_81DE_00402641B7F4__INCLUDED_)
#define AFX_PRINTERDLG_H__20B34808_A121_11D4_81DE_00402641B7F4__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

/////////////////////////////////////////////////////////////////////////////
// CPrinterDlg dialog

class CPrinterDlg : public CDialog
{
// Construction
public:
	CPrinterDlg(CWnd* pParent = NULL);	// standard constructor

// Dialog Data
	//{{AFX_DATA(CPrinterDlg)
	enum { IDD = IDD_PRINTER_DIALOG };
	CEdit	m_edtRetrieveSt;
	int		m_Counter;
	CCoPtr	m_Ptr1;
	//}}AFX_DATA

	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CPrinterDlg)
	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV support
	//}}AFX_VIRTUAL

// Implementation
protected:
	HICON m_hIcon;

	// Generated message map functions
	//{{AFX_MSG(CPrinterDlg)
	virtual BOOL OnInitDialog();
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();
	afx_msg void OnClose();
	afx_msg void OnBtnRec1();
	afx_msg void OnBtnRec2();
	afx_msg void OnBtnRec3();
	afx_msg void OnBtnSlp1();
	afx_msg void OnBtnDio1();
	afx_msg void OnBtnDio2();
	afx_msg void OnBtnMcReset();
	afx_msg void OnBtnMcGet();
	afx_msg void OnBtnMcCumulative();
	afx_msg void OnBtnRetrievSt();
	afx_msg void OnBtnRec4();
	afx_msg void OnBtnRec5();
	afx_msg void OnBtnRec6();
	afx_msg void OnErrorEventPosprinter1(long ResultCode, long ResultCodeExtended, long ErrorLocus, long FAR* pErrorResponse);
	afx_msg void OnOutputCompleteEventPosprinter1(long OutputID);
	afx_msg void OnStatusUpdateEventPosprinter1(long Data);
	DECLARE_EVENTSINK_MAP()
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
private:
	CString GetErrorMsg();
	BOOL SlpRemoval();
	BOOL SlpInsertion();

	BOOL m_bStateCover;		// Cover state.
	BOOL m_bStatePaper;		// Paper state.
	BOOL m_bCoverSensor;	// CapCoverSensor.
};

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_PRINTERDLG_H__20B34808_A121_11D4_81DE_00402641B7F4__INCLUDED_)
