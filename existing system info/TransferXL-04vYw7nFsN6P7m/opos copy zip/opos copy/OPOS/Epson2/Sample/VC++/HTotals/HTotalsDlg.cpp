// HTotalsDlg.cpp : implementation file
//

#include "stdafx.h"
#include "HTotals.h"
#include "HTotalsDlg.h"
#include "OPOS.h"
#include "OPOSTot.h"
#include "XMLView.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#undef THIS_FILE
static char THIS_FILE[] = __FILE__;
#endif

/////////////////////////////////////////////////////////////////////////////
// CHTotalsDlg dialog

CHTotalsDlg::CHTotalsDlg(CWnd* pParent /*=NULL*/)
	: CDialog(CHTotalsDlg::IDD, pParent)
{
	//{{AFX_DATA_INIT(CHTotalsDlg)
	m_ListFile = _T("");
	m_CreateFile = _T("");
	m_Register = _T("");
	m_Change = _T("");
	//}}AFX_DATA_INIT
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
}

void CHTotalsDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	//{{AFX_DATA_MAP(CHTotalsDlg)
	DDX_Control(pDX, IDC_EDIT_RETRIEVST, m_edtRetrieveSt);
	DDX_LBString(pDX, IDC_LIST_FILE, m_ListFile);
	DDX_Text(pDX, IDC_EDIT_CREATE, m_CreateFile);
	DDX_Text(pDX, IDC_EDIT_REGISTER, m_Register);
	DDV_MaxChars(pDX, m_Register, 255);
	DDX_Text(pDX, IDC_EDIT_CHANGE, m_Change);
	DDX_Control(pDX, IDC_TOTALS1, m_Totals1);
	//}}AFX_DATA_MAP
}

BEGIN_MESSAGE_MAP(CHTotalsDlg, CDialog)
	//{{AFX_MSG_MAP(CHTotalsDlg)
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	ON_WM_CLOSE()
	ON_BN_CLICKED(IDC_BTN_CREATE, OnBtnCreate)
	ON_BN_CLICKED(IDC_BTN_CHANGE, OnBtnChange)
	ON_BN_CLICKED(IDC_BTN_DELETE, OnBtnDelete)
	ON_BN_CLICKED(IDC_BTN_REGISTER, OnBtnRegister)
	ON_LBN_SELCHANGE(IDC_LIST_FILE, OnSelchangeListFile)
	ON_BN_CLICKED(IDC_BTN_RETRIEVST, OnBtnRetrievSt)
	//}}AFX_MSG_MAP
END_MESSAGE_MAP()

/////////////////////////////////////////////////////////////////////////////
// CHTotalsDlg message handlers

BOOL CHTotalsDlg::OnInitDialog()
{
	CDialog::OnInitDialog();

	SetIcon(m_hIcon, TRUE);			// Set big icon
	SetIcon(m_hIcon, FALSE);		// Set small icon
	
	// TODO: Add extra initialization here
	BOOL bError = FALSE;
    while( 1 ) {
		// Open the device
		// Use a Logical Device Name which has been set on the SetupPOS.
		m_Totals1.Open("Unit1");
		// Check whether the device is succeed to open, or not
		if( m_Totals1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("This device has not been registered, or cannot use.");
			bError = TRUE;
			break;
		}

		// Get the exclusive control right for the opened device.
		// Then the device is disable from other application.
		//(Notice:When using an old CO, use the Claim.)
		m_Totals1.ClaimDevice( 1000 );
        if( m_Totals1.GetResultCode() != OPOS_SUCCESS ) {
            MessageBox("Fails to get the exclusive right for the device.");
			bError = TRUE;
			break;
        }

		// Enable the device.
		m_Totals1.SetDeviceEnabled( TRUE );
		// Check whether the device is enable to use, or not
		if( m_Totals1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("Now the device is disable to use.");
			bError = TRUE;
			break;
		}

		// Set the edit box of parameter input.
		CString	strParam = _T("ModelName,HoursPoweredCount");
		m_edtRetrieveSt.SetWindowText( strParam );

		// Checks whether it has function to obtain 
		// the statistics of devices.
		// If it does not have the function, invalidates
		// the [Retrieve Statistics] button and the edit box
		// of parameter input.
		if( !m_Totals1.GetCapStatisticsReporting() )
		{	// CapStatisticsReporting = FALSE
			GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
		}

		break;
	}

	if( bError ) {
		// Disable all buttons
		GetDlgItem(IDC_BTN_CREATE)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_CHANGE)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_DELETE)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_REGISTER)->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_FILELIST)->EnableWindow(FALSE);
	}

	ListRefresh();						// Update the file list.

	return TRUE;  // return TRUE  unless you set the focus to a control
}

// If you add a minimize button to your dialog, you will need the code below
//  to draw the icon.  For MFC applications using the document/view model,
//  this is automatically done for you by the framework.

void CHTotalsDlg::OnPaint() 
{
	if (IsIconic())
	{
		CPaintDC dc(this); // device context for painting

		SendMessage(WM_ICONERASEBKGND, (WPARAM) dc.GetSafeHdc(), 0);

		// Center icon in client rectangle
		int cxIcon = GetSystemMetrics(SM_CXICON);
		int cyIcon = GetSystemMetrics(SM_CYICON);
		CRect rect;
		GetClientRect(&rect);
		int x = (rect.Width() - cxIcon + 1) / 2;
		int y = (rect.Height() - cyIcon + 1) / 2;

		// Draw the icon
		dc.DrawIcon(x, y, m_hIcon);
	}
	else
	{
		CDialog::OnPaint();
	}
}

HCURSOR CHTotalsDlg::OnQueryDragIcon()
{
	return (HCURSOR) m_hIcon;
}

void CHTotalsDlg::OnClose() 
{
	// Cancel the device
	m_Totals1.SetDeviceEnabled( FALSE );

	// Release the device exclusive control right.
	//(Notice:When using an old CO, use the Release.)
	m_Totals1.ReleaseDevice();

	// Finish using the device.
	m_Totals1.Close();
	
	CDialog::OnClose();
}

////////////////////////////////////////////////////////////////////////////////
//	Create
//
// Make files
//
void CHTotalsDlg::OnBtnCreate() 
{
	long pHandle;

	UpdateData(TRUE);

// Check whether there is free capacity for maiking files, or not
	if( m_Totals1.GetFreeData() < 128 ) {
		MessageBox("Cannot be secured for the free capacity for the totals device");
		return;
	}

// Check on the limit of numbers of the files
// (Only when using the NVRAM as the device, needed to make a limit on files. When using CompactFlash, no need for this.)
    if( m_Totals1.GetNumberOfFiles() >= 9 ) {
        MessageBox("The maximum number of total files are up to 10.");
        return;
    }

// Create a file name using the text input into the box. Creat it with 128bytes.
	if( m_Totals1.Create(m_CreateFile, &pHandle, 128, FALSE) != OPOS_SUCCESS ) {
		MessageBox("Fails to create a file.");
		return;
	}

	ListRefresh();						// Update the file list.
}

////////////////////////////////////////////////////////////////////////////////
//	Change
//
// Modify a file name selected on the list.
//
void CHTotalsDlg::OnBtnChange() 
{
	long pSize;
	long pHandle;

	UpdateData(TRUE);

// Request for a file handle.
    if( m_Totals1.Find(m_ListFile, &pHandle, &pSize) != OPOS_SUCCESS ) {
        MessageBox("Fails to get the file handle.");
        return;
    }

// Modigy a file name as input into the text box, using the requested file handle.
    if( m_Totals1.Rename(pHandle, m_Change) != OPOS_SUCCESS ) {
        MessageBox("Fails to rename.");
        return;
    }

	ListRefresh();						// Update the file list.
}

////////////////////////////////////////////////////////////////////////////////
//	Delete
//
// Delete the selected files
//
void CHTotalsDlg::OnBtnDelete() 
{
	UpdateData(TRUE);

	if( m_Totals1.Delete(m_ListFile) != OPOS_SUCCESS ) {
		MessageBox("Fails to delete.");
		return;
	}

	ListRefresh();						// Update the file list.
}

////////////////////////////////////////////////////////////////////////////////
//	Register
//
// Write information in the selected file
//
void CHTotalsDlg::OnBtnRegister() 
{
	long pSize;
	long pHandle;

	UpdateData(TRUE);

	if( m_Totals1.Find(m_ListFile, &pHandle, &pSize) != OPOS_SUCCESS ) {
		MessageBox("Fails to get the file handle.");
		return;
	}

	if( m_Totals1.Write(pHandle, m_Register, 0, m_Register.GetLength()) != OPOS_SUCCESS ) {
		MessageBox("Fails to delete.");
		return;
	}
}

////////////////////////////////////////////////////////////////////////////////
//	ListRefresh()
//
// Make a list of the all files
//
void CHTotalsDlg::ListRefresh()
{
	int i;
	CListBox* plst = (CListBox*)GetDlgItem(IDC_LIST_FILE);
	CString cFileName(' ', 256);
	BSTR pFileName;

	pFileName = cFileName.AllocSysString();
	if( m_Totals1.FindByIndex( 0, &pFileName ) != OPOS_SUCCESS )
	{
		if(pFileName)
		{
			SysFreeString( pFileName );
		}
		return;
	}
	for( i = 0; (TCHAR)pFileName[i] != NULL; i++ )
		cFileName.SetAt( i, (TCHAR)pFileName[i]);
	cFileName = cFileName.Left(i);
	SysFreeString( pFileName );

	plst->ResetContent();
	while(1) {
		i = cFileName.Find('\r');
		if( i == -1 )
			break;
		plst->AddString( cFileName.Left( i ));
		cFileName = cFileName.Mid( i+1 );
	}
}

////////////////////////////////////////////////////////////////////////////////
//	Handle when a file is selected on the list.
//
void CHTotalsDlg::OnSelchangeListFile() 
{
	int i;
	long pHandle;
	long pSize;
	CString cData(' ', 256);
	BSTR pData;

	UpdateData(TRUE);

// Copy the selected file name to (Change) button.
	m_Change = m_ListFile;

// Request a file handle from the selected file name.
	if( m_Totals1.Find( m_ListFile, &pHandle, &pSize ) != OPOS_SUCCESS ) {
		MessageBox("Fails to get the file handle.");
		return;
	}
// Read a registered information from the requested file handle, and display it.
	pData = cData.AllocSysString();
	if( m_Totals1.Read( pHandle, &pData, 0, pSize ) != OPOS_SUCCESS ) {
		MessageBox("Fails to delete.");
		return;
	}

	for( i = 0; (TCHAR)pData[i] != NULL; i++ )
		cData.SetAt( i, (TCHAR)pData[i]);
	m_Register = cData.Left(i);
	UpdateData(FALSE);
	SysFreeString( pData );
}


void CHTotalsDlg::OnBtnRetrievSt() 
{
	CString	strParam;
	CString	strErrMsg;
	CString	strXMLPath;
	BSTR	bstrParam;

    m_edtRetrieveSt.GetWindowText(strParam);
    strErrMsg.Empty();
	bstrParam = strParam.AllocSysString();

    // Obtains the statistics of the device and stores it in a file.
	m_Totals1.RetrieveStatistics( &bstrParam );
	if( m_Totals1.GetResultCode() != OPOS_SUCCESS )
	{
		CString	strTemp;
		strErrMsg  = _T("RetrieveStatistics method error.\n\n");
		strTemp.Format("%d", m_Totals1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_Totals1.GetResultCodeExtended() );
		strErrMsg += _T("ResultCodeExtended = ") + strTemp;
		MessageBox( strErrMsg );
		return;
	}
    
	strXMLPath = _T("Sample.xml");
	strParam = bstrParam;
	::SysFreeString( bstrParam );

	CFile cfXMLFile( strXMLPath, CFile::modeCreate | CFile::modeWrite );
	strXMLPath = cfXMLFile.GetFilePath();
	cfXMLFile.Write( strParam, strParam.GetLength() );
	cfXMLFile.Close();

	// Opens another window and indicates the information of the XML file.
	CXMLView cxmlDlg;
	cxmlDlg.SetXMLFilePath( strXMLPath );
    cxmlDlg.DoModal();
}
