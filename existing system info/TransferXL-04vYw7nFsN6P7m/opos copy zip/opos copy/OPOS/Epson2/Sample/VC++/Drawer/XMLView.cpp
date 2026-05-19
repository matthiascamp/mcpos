// XMLView.cpp : implementation file
//

#include "stdafx.h"
#include "Drawer.h"
#include "XMLView.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#undef THIS_FILE
static char THIS_FILE[] = __FILE__;
#endif

/////////////////////////////////////////////////////////////////////////////
// CXMLView dialog


CXMLView::CXMLView(CWnd* pParent /*=NULL*/)
	: CDialog(CXMLView::IDD, pParent)
{
	//{{AFX_DATA_INIT(CXMLView)
		// NOTE: the ClassWizard will add member initialization here
	//}}AFX_DATA_INIT
}


void CXMLView::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	//{{AFX_DATA_MAP(CXMLView)
	DDX_Control(pDX, IDC_EXPLORER_WMLVIEW, m_wbXmlView);
	//}}AFX_DATA_MAP
}


BEGIN_MESSAGE_MAP(CXMLView, CDialog)
	//{{AFX_MSG_MAP(CXMLView)
	//}}AFX_MSG_MAP
END_MESSAGE_MAP()

/////////////////////////////////////////////////////////////////////////////
// CXMLView message handlers

BOOL CXMLView::OnInitDialog() 
{
	CDialog::OnInitDialog();
	
	// TODO: Add extra initialization here
	// Indicates it on the browser screen.
	m_wbXmlView.Navigate( m_strXmlFilePath, 0, 0, 0, 0 );

	return TRUE;  // return TRUE unless you set the focus to a control
	              // EXCEPTION: OCX Property Pages should return FALSE
}

void CXMLView::SetXMLFilePath(CString strXmlFilePath)
{
	// Obtains the path of the stored XML file.
	m_strXmlFilePath = strXmlFilePath;
}
