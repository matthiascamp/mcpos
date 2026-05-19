// ElectronicJournal.h : main header file for the ELECTRONICJOURNAL application
//

#if !defined(AFX_ELECTRONICJOURNAL_H__57632645_8628_432C_8C13_BDDBF4A1CDA3__INCLUDED_)
#define AFX_ELECTRONICJOURNAL_H__57632645_8628_432C_8C13_BDDBF4A1CDA3__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000

#ifndef __AFXWIN_H__
	#error include 'stdafx.h' before including this file for PCH
#endif

#include "resource.h"		// main symbols

/////////////////////////////////////////////////////////////////////////////
// CElectronicJournalApp:
// See ElectronicJournal.cpp for the implementation of this class
//

class CElectronicJournalApp : public CWinApp
{
public:
	CElectronicJournalApp();

// Overrides
	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CElectronicJournalApp)
	public:
	virtual BOOL InitInstance();
	//}}AFX_VIRTUAL

// Implementation

	//{{AFX_MSG(CElectronicJournalApp)
		// NOTE - the ClassWizard will add and remove member functions here.
		//    DO NOT EDIT what you see in these blocks of generated code !
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()
};


/////////////////////////////////////////////////////////////////////////////

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_ELECTRONICJOURNAL_H__57632645_8628_432C_8C13_BDDBF4A1CDA3__INCLUDED_)
