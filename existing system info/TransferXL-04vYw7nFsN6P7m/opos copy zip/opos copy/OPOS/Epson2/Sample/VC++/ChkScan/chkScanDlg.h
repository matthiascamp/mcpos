// chkScanDlg.h : header file
//
//{{AFX_INCLUDES()
#include "cocscn.h"
#include "comicr.h"
//}}AFX_INCLUDES

#if !defined(AFX_CHKSCANDLG_H__4AE14DC8_ACE7_11D5_B477_00105A700D58__INCLUDED_)
#define AFX_CHKSCANDLG_H__4AE14DC8_ACE7_11D5_B477_00105A700D58__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

/////////////////////////////////////////////////////////////////////////////
// CChkScanDlg dialog

class CChkScanDlg : public CDialog
{
private:
	int m_iCropAreaIndex;
	long m_lImgFormat;
	bool m_blnMicrEvent;
	bool m_bMICRError;
	CString m_strMicrData;
	CString m_strStepData;
	CString m_cscnPath;
	void ImCreateFile(CString fPath);
	void ImWriteFile(CString fPath,CByteArray* fData,long fSize);
	void AllHide();
	long GetDataSize();
// Construction
public:
	CChkScanDlg(CWnd* pParent = NULL);	// standard constructor

// Dialog Data
	//{{AFX_DATA(CChkScanDlg)
	enum { IDD = IDD_CHKSCAN_DIALOG };
	CEdit	m_edtRetrieveSt;
	CComboBox	m_CmbChangeMode;
	CButton	m_ctlPreScan;
	CCoCSn	m_Cochkscan1;
	CCoMicr	m_Comicr1;
	//}}AFX_DATA

	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CChkScanDlg)
	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV support
	//}}AFX_VIRTUAL

// Implementation
protected:
	HICON m_hIcon;

	// Generated message map functions
	//{{AFX_MSG(CChkScanDlg)
	virtual BOOL OnInitDialog();
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();
	afx_msg void OnBtnCreatef();
	afx_msg void OnClose();
	afx_msg void OnRdoCrop1();
	afx_msg void OnRdoCrop2();
	afx_msg void OnRdoCrop3();
	afx_msg void OnBtnRead();
	afx_msg void OnBtnMicrattach();
	afx_msg void OnBtnReadmemory();
	afx_msg void OnBtnStore();
	afx_msg void OnSelchangeCmbCm();
	afx_msg void OnBtnRetrievSt();
	afx_msg void OnDataEventCheckscanner1(long Status);
	afx_msg void OnErrorEventCheckscanner1(long ResultCode, long ResultCodeExtended, long ErrorLocus, long FAR* pErrorResponse);
	afx_msg void OnDataEventMicr1(long Status);
	afx_msg void OnErrorEventMicr1(long ResultCode, long ResultCodeExtended, long ErrorLocus, long FAR* pErrorResponse);
	DECLARE_EVENTSINK_MAP()
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
};

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_CHKSCANDLG_H__4AE14DC8_ACE7_11D5_B477_00105A700D58__INCLUDED_)
