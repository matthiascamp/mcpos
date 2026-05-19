// Keylock.h : main header file for the KEYLOCK application
//

#if !defined(AFX_KEYLOCK_H__AC9CE225_A501_11D4_81DE_00402641B7F4__INCLUDED_)
#define AFX_KEYLOCK_H__AC9CE225_A501_11D4_81DE_00402641B7F4__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

#ifndef __AFXWIN_H__
	#error include 'stdafx.h' before including this file for PCH
#endif

#include "resource.h"		// main symbols

/////////////////////////////////////////////////////////////////////////////
// CKeylockApp:
// See Keylock.cpp for the implementation of this class
//

class CKeylockApp : public CWinApp
{
public:
	CKeylockApp();

// Overrides
	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CKeylockApp)
	public:
	virtual BOOL InitInstance();
	//}}AFX_VIRTUAL

// Implementation

	//{{AFX_MSG(CKeylockApp)
		// NOTE - the ClassWizard will add and remove member functions here.
		//    DO NOT EDIT what you see in these blocks of generated code !
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
};


/////////////////////////////////////////////////////////////////////////////

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_KEYLOCK_H__AC9CE225_A501_11D4_81DE_00402641B7F4__INCLUDED_)
