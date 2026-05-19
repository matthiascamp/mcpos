// MICR.h : main header file for the MICR application
//

#if !defined(AFX_MICR_H__AD5DC9C5_A454_11D4_81DE_00402641B7F4__INCLUDED_)
#define AFX_MICR_H__AD5DC9C5_A454_11D4_81DE_00402641B7F4__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

#ifndef __AFXWIN_H__
	#error include 'stdafx.h' before including this file for PCH
#endif

#include "resource.h"		// main symbols

/////////////////////////////////////////////////////////////////////////////
// CMICRApp:
// See MICR.cpp for the implementation of this class
//

class CMICRApp : public CWinApp
{
public:
	CMICRApp();

// Overrides
	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CMICRApp)
	public:
	virtual BOOL InitInstance();
	//}}AFX_VIRTUAL

// Implementation

	//{{AFX_MSG(CMICRApp)
		// NOTE - the ClassWizard will add and remove member functions here.
		//    DO NOT EDIT what you see in these blocks of generated code !
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
};


/////////////////////////////////////////////////////////////////////////////

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_MICR_H__AD5DC9C5_A454_11D4_81DE_00402641B7F4__INCLUDED_)
