//{{AFX_INCLUDES()
#include "webbrowser2.h"
//}}AFX_INCLUDES
#if !defined(AFX_XMLVIEW_H__1C900987_2883_4BC3_AB72_E858C1563B8F__INCLUDED_)
#define AFX_XMLVIEW_H__1C900987_2883_4BC3_AB72_E858C1563B8F__INCLUDED_

#if _MSC_VER >= 1000
#pragma once
#endif // _MSC_VER >= 1000
// XMLView.h : header file
//

/////////////////////////////////////////////////////////////////////////////
// CXMLView dialog

class CXMLView : public CDialog
{
// Construction
public:
	CXMLView(CWnd* pParent = NULL);   // standard constructor
	void SetXMLFilePath(CString strXmlFilePath);

// Dialog Data
	//{{AFX_DATA(CXMLView)
	enum { IDD = IDD_XMLVIEW_DIALOG };
	CWebBrowser2	m_wbXmlView;
	//}}AFX_DATA


// Overrides
	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CXMLView)
	protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV support
	//}}AFX_VIRTUAL

// Implementation
protected:

	// Generated message map functions
	//{{AFX_MSG(CXMLView)
	virtual BOOL OnInitDialog();
	//}}AFX_MSG
	DECLARE_MESSAGE_MAP()

private:
	CString	m_strXmlFilePath;

};

//{{AFX_INSERT_LOCATION}}
// Microsoft Developer Studio will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_XMLVIEW_H__1C900987_2883_4BC3_AB72_E858C1563B8F__INCLUDED_)
