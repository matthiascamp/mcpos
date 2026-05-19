// chkScan.h : main header file for the CHKSCAN application
//

#if !defined(AFX_CHKSCAN_H__4AE14DC6_ACE7_11D5_B477_00105A700D58__INCLUDED_)
#define AFX_CHKSCAN_H__4AE14DC6_ACE7_11D5_B477_00105A700D58__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

#ifndef __AFXWIN_H__
	#error include 'stdafx.h' before including this file for PCH
#endif

#include "resource.h"		// main symbols

/////////////////////////////////////////////////////////////////////////////
// CChkScanApp:
// See chkScan.cpp for the implementation of this class
//

class CChkScanApp : public CWinApp
{
public:
	CChkScanApp();

// Overrides
	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CChkScanApp)
	public:
	virtual BOOL InitInstance();
	//}}AFX_VIRTUAL

// Implementation

	//{{AFX_MSG(CChkScanApp)
		// NOTE - the ClassWizard will add and remove member functions here.
		//    DO NOT EDIT what you see in these blocks of generated code !
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
};


/////////////////////////////////////////////////////////////////////////////

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_CHKSCAN_H__4AE14DC6_ACE7_11D5_B477_00105A700D58__INCLUDED_)
