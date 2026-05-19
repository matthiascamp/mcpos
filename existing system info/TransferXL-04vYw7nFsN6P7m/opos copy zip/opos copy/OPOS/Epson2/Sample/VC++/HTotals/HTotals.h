// HTotals.h : main header file for the HTOTALS application
//

#if !defined(AFX_HTOTALS_H__DF6DD166_A442_11D4_81DE_00402641B7F4__INCLUDED_)
#define AFX_HTOTALS_H__DF6DD166_A442_11D4_81DE_00402641B7F4__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

#ifndef __AFXWIN_H__
	#error include 'stdafx.h' before including this file for PCH
#endif

#include "resource.h"		// main symbols

/////////////////////////////////////////////////////////////////////////////
// CHTotalsApp:
// See HTotals.cpp for the implementation of this class
//

class CHTotalsApp : public CWinApp
{
public:
	CHTotalsApp();

// Overrides
	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CHTotalsApp)
	public:
	virtual BOOL InitInstance();
	//}}AFX_VIRTUAL

// Implementation

	//{{AFX_MSG(CHTotalsApp)
		// NOTE - the ClassWizard will add and remove member functions here.
		//    DO NOT EDIT what you see in these blocks of generated code !
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
};


/////////////////////////////////////////////////////////////////////////////

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_HTOTALS_H__DF6DD166_A442_11D4_81DE_00402641B7F4__INCLUDED_)
