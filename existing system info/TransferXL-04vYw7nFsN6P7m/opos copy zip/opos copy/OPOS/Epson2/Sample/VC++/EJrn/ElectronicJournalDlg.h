// ElectronicJournalDlg.h : header file
//
//{{AFX_INCLUDES()
#include "oposelectronicjournal.h"
#include "oposposprinter.h"
//}}AFX_INCLUDES

#if !defined(AFX_ELECTRONICJOURNALDLG_H__8F1854D9_512F_4054_A11E_BF28847B20B1__INCLUDED_)
#define AFX_ELECTRONICJOURNALDLG_H__8F1854D9_512F_4054_A11E_BF28847B20B1__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

/////////////////////////////////////////////////////////////////////////////
// CElectronicJournalDlg dialog

class CElectronicJournalDlg : public CDialog
{
// Construction
public:
	CElectronicJournalDlg(CWnd* pParent = NULL);	// standard constructor
	CPtrArray m_paDialogs;

// Dialog Data
	//{{AFX_DATA(CElectronicJournalDlg)
	enum { IDD = IDD_ELECTRONICJOURNAL_DIALOG };
	COPOSElectronicJournal	m_EJrn1;
	COPOSPOSPrinter	m_Ptr1;
	//}}AFX_DATA

	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CElectronicJournalDlg)
	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV support
	//}}AFX_VIRTUAL

// Implementation
protected:
	HICON m_hIcon;

	bool m_bPtrRecNearEmpty;
	bool m_bEJAsyncPrinting;

	// Generated message map functions
	//{{AFX_MSG(CElectronicJournalDlg)
	virtual BOOL OnInitDialog();
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();
	afx_msg void OnButtonAddmarker();
	afx_msg void OnButtonCancel();
	afx_msg void OnButtonFilechoose();
	afx_msg void OnButtonPrintReceipt();
	afx_msg void OnButtonPrintfile();
	afx_msg void OnButtonQuery();
	afx_msg void OnButtonResume();
	afx_msg void OnButtonStatsEj();
	afx_msg void OnButtonStatsPtr();
	afx_msg void OnButtonSuspend();
	afx_msg void OnCheckAsync();
	afx_msg void OnCheckDataevent();
	afx_msg void OnCheckStorage();
	afx_msg void OnClose();
	afx_msg void OnDataEventElectronicjournal1(long Status);
	afx_msg void OnErrorEventElectronicjournal1(long ResultCode, long ResultCodeExtended, long ErrorLocus, long FAR* pErrorResponse);
	afx_msg void OnOutputCompleteEventElectronicjournal1(long OutputID);
	afx_msg void OnStatusUpdateEventElectronicjournal1(long Data);
	afx_msg void OnStatusUpdateEventPosprinter1(long Data);
	DECLARE_EVENTSINK_MAP()
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
};

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_ELECTRONICJOURNALDLG_H__8F1854D9_512F_4054_A11E_BF28847B20B1__INCLUDED_)
