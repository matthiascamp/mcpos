// ElectronicJournalDlg.cpp : implementation file
//

#include "stdafx.h"
#include "ElectronicJournal.h"
#include "ElectronicJournalDlg.h"
#include "OPOS.h"
#include "OPOSPtr.h"
#include "EPSNPtr.h"
#include "OPOSEJ.h"
#include "EPSNEJ.h"
#include "XMLView.h"
#include "ErrorDialog.h"
#include "OutputCompleteDialog.h"

typedef struct tITEMDATA {
    long Price;
    CString Name;
} ITEMDATA;

#ifdef _DEBUG
#define new DEBUG_NEW
#undef THIS_FILE
static char THIS_FILE[] = __FILE__;
#endif

/////////////////////////////////////////////////////////////////////////////
// CElectronicJournalDlg dialog

CElectronicJournalDlg::CElectronicJournalDlg(CWnd* pParent /*=NULL*/)
	: CDialog(CElectronicJournalDlg::IDD, pParent)
{
	//{{AFX_DATA_INIT(CElectronicJournalDlg)
	//}}AFX_DATA_INIT
	// Note that LoadIcon does not require a subsequent DestroyIcon in Win32
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
}

void CElectronicJournalDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	//{{AFX_DATA_MAP(CElectronicJournalDlg)
	DDX_Control(pDX, IDC_ELECTRONICJOURNAL1, m_EJrn1);
	DDX_Control(pDX, IDC_POSPRINTER1, m_Ptr1);
	//}}AFX_DATA_MAP
}

BEGIN_MESSAGE_MAP(CElectronicJournalDlg, CDialog)
	//{{AFX_MSG_MAP(CElectronicJournalDlg)
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	ON_BN_CLICKED(IDC_BUTTON_ADDMARKER, OnButtonAddmarker)
	ON_BN_CLICKED(IDC_BUTTON_CANCEL, OnButtonCancel)
	ON_BN_CLICKED(IDC_BUTTON_FILECHOOSE, OnButtonFilechoose)
	ON_BN_CLICKED(IDC_BUTTON_PRINT_RECEIPT, OnButtonPrintReceipt)
	ON_BN_CLICKED(IDC_BUTTON_PRINTFILE, OnButtonPrintfile)
	ON_BN_CLICKED(IDC_BUTTON_QUERY, OnButtonQuery)
	ON_BN_CLICKED(IDC_BUTTON_RESUME, OnButtonResume)
	ON_BN_CLICKED(IDC_BUTTON_STATS_EJ, OnButtonStatsEj)
	ON_BN_CLICKED(IDC_BUTTON_STATS_PTR, OnButtonStatsPtr)
	ON_BN_CLICKED(IDC_BUTTON_SUSPEND, OnButtonSuspend)
	ON_BN_CLICKED(IDC_CHECK_ASYNC, OnCheckAsync)
	ON_BN_CLICKED(IDC_CHECK_DATAEVENT, OnCheckDataevent)
	ON_BN_CLICKED(IDC_CHECK_STORAGE, OnCheckStorage)
	ON_BN_CLICKED(IDC_CLOSE, OnClose)
	//}}AFX_MSG_MAP
END_MESSAGE_MAP()

/////////////////////////////////////////////////////////////////////////////
// CElectronicJournalDlg message handlers

BOOL CElectronicJournalDlg::OnInitDialog()
{
	CDialog::OnInitDialog();

	// Set the icon for this dialog.  The framework does this automatically
	//  when the application's main window is not a dialog
	SetIcon(m_hIcon, TRUE);			// Set big icon
	SetIcon(m_hIcon, FALSE);		// Set small icon
	
	// TODO: Add extra initialization here

	/////////////////////////////////////
	// Initialize POSPrinter
	/////////////////////////////////////

	m_bEJAsyncPrinting = FALSE;
	m_bPtrRecNearEmpty = FALSE;

	BOOL bError = FALSE;
	//Open the device
	//Use a Logical Device Name which has been set on the SetupPOS.
	m_Ptr1.Open("Unit1");
	//Check whether the device is succeed to open, or not
	if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
		MessageBox("This POSPrinter device has not been registered, or cannot use.");
		bError = TRUE;
	}

	if(!bError)
	{
		//Get the exclusive control right for the opened device.
		//Then the device is disable from other application.
		//(Notice:When using an old CO, use the Claim.)
		m_Ptr1.ClaimDevice( 1000 );
		if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("Fails to get the exclusive right for the POSPrinter device.");
			bError = TRUE;
		}
	}

	if(!bError)
	{
		//Enable the device.
		m_Ptr1.SetDeviceEnabled( TRUE );
		//Check whether the device is enable to use, or not
		if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("Now the POSPrinter device is disable to use.");
			bError = TRUE;
		}
	}

	if(bError)
	{
		//Disable all buttons
		GetDlgItem(IDC_BUTTON_PRINT_RECEIPT)->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_STATS_PTR)	->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_SUSPEND)		->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_RESUME)		->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_CANCEL)		->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_QUERY)		->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_ADDMARKER)	->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_PRINTFILE)	->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_STATS_EJ )	->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_FILECHOOSE)	->EnableWindow(FALSE);
		GetDlgItem(IDC_CHECK_STORAGE)		->EnableWindow(FALSE);
		GetDlgItem(IDC_CHECK_DATAEVENT)		->EnableWindow(FALSE);
		GetDlgItem(IDC_CHECK_ASYNC)			->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_STATS_PTR)		->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_ADDMARKER)		->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_PRINT_FILENAME)	->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_STATS_EJ)		->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_QUERY_FILENAME)	->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_QUERY_SMARKER)	->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_QUERY_EMARKER)	->EnableWindow(FALSE);

		return TRUE;
	}
	else
	{
		m_Ptr1.SetMapMode( PTR_MM_METRIC );
		m_Ptr1.SetRecLetterQuality( TRUE );

		GetDlgItem(IDC_EDIT_STATS_PTR)	->SetWindowText("ModelName,HoursPoweredCount,ReceiptCharacterPrintedCount");

		// Check Statistics available
		if(!m_Ptr1.GetCapStatisticsReporting())
		{
			GetDlgItem(IDC_EDIT_STATS_PTR)		->EnableWindow(FALSE);
			GetDlgItem(IDC_BUTTON_STATS_PTR)	->EnableWindow(FALSE);
		}
	}

	/////////////////////////////////////
	// Initialize ElectronicJournal
	/////////////////////////////////////

	//Open the device
	//Use a Logical Device Name which has been set on the SetupPOS.
	m_EJrn1.Open("Unit1");
	//Check whether the device is succeed to open, or not
	if( m_EJrn1.GetResultCode() != OPOS_SUCCESS ) {
		MessageBox("This ElectronicJournal device has not been registered, or cannot use.");
		bError = TRUE;
	}

	if(!bError)
	{
		//Get the exclusive control right for the opened device.
		//Then the device is disable from other application.
		//(Notice:When using an old CO, use the Claim.)
		m_EJrn1.ClaimDevice( 1000 );
		if( m_EJrn1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("Fails to get the exclusive right for the ElectronicJournal device.");
			bError = TRUE;
		}
	}

	if(!bError)
	{
		//Enable the device.
		m_EJrn1.SetDeviceEnabled( TRUE );
		//Check whether the device is enable to use, or not
		if( m_EJrn1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("Now the ElectronicJournal device is disable to use.");
			bError = TRUE;
		}
	}

	if(!bError)
	{
		// Check statistics available.
		if(!m_EJrn1.GetCapStatisticsReporting())
		{
			GetDlgItem(IDC_EDIT_STATS_EJ)		->EnableWindow(FALSE);
			GetDlgItem(IDC_BUTTON_STATS_EJ)		->EnableWindow(FALSE);
		}
	}

	if(!bError)
	{
		// StorageEnabled
		m_EJrn1.SetStorageEnabled( TRUE );
		//Check whether the storage enabled to use, or not
		if(m_EJrn1.GetResultCode() != OPOS_SUCCESS) {
			MessageBox("Now the ElectronicJournal Storage is disabled.");
			bError = TRUE;
		}
		else {
			CButton* pButton = (CButton*)GetDlgItem(IDC_CHECK_STORAGE);
			pButton->SetCheck(TRUE);
		}
	}

	TCHAR* szDIR = new TCHAR[256];
	GetModuleFileName(NULL,szDIR,256);
	CString strPath = CString(szDIR);
	delete szDIR;

	strPath = strPath.Left(strPath.ReverseFind('\\') + 1);

	if(bError)
	{
		//Disable ElectronicJournal function
		GetDlgItem(IDC_BUTTON_QUERY)		->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_ADDMARKER)	->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_PRINTFILE)	->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_STATS_EJ )	->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_FILECHOOSE)	->EnableWindow(FALSE);
		GetDlgItem(IDC_CHECK_STORAGE)		->EnableWindow(FALSE);
		GetDlgItem(IDC_CHECK_DATAEVENT)		->EnableWindow(FALSE);
		GetDlgItem(IDC_CHECK_ASYNC)			->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_ADDMARKER)		->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_PRINT_FILENAME)	->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_STATS_EJ)		->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_QUERY_FILENAME)	->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_QUERY_SMARKER)	->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_QUERY_EMARKER)	->EnableWindow(FALSE);
	}
	else
	{
		GetDlgItem(IDC_EDIT_ADDMARKER)		->SetWindowText("MarkerBySample1");
		GetDlgItem(IDC_EDIT_PRINT_FILENAME)	->SetWindowText(strPath + "ElectronicJournalFile1");
		GetDlgItem(IDC_EDIT_STATS_EJ)		->SetWindowText("ModelName,HoursPoweredCount,WriteCount,EraseCount");
		GetDlgItem(IDC_EDIT_QUERY_FILENAME)	->SetWindowText(strPath + "ElectronicJournalFile1");
		GetDlgItem(IDC_EDIT_QUERY_SMARKER)	->SetWindowText("MarkerBySample1");
		GetDlgItem(IDC_EDIT_QUERY_EMARKER)	->SetWindowText("MarkerBySample2");
	}

	GetDlgItem(IDC_BUTTON_SUSPEND)		->EnableWindow(FALSE);
	GetDlgItem(IDC_BUTTON_RESUME)		->EnableWindow(FALSE);
	GetDlgItem(IDC_BUTTON_CANCEL)		->EnableWindow(FALSE);

	return TRUE;  // return TRUE  unless you set the focus to a control
}

// If you add a minimize button to your dialog, you will need the code below
//  to draw the icon.  For MFC applications using the document/view model,
//  this is automatically done for you by the framework.

void CElectronicJournalDlg::OnPaint() 
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

// The system calls this to obtain the cursor to display while the user drags
//  the minimized window.
HCURSOR CElectronicJournalDlg::OnQueryDragIcon()
{
	return (HCURSOR) m_hIcon;
}

void CElectronicJournalDlg::OnButtonAddmarker() 
{
	// TODO: Add your control notification handler code here

	CString strMarker;
	GetDlgItem(IDC_EDIT_ADDMARKER)->GetWindowText(strMarker);

	m_EJrn1.AddMarker(strMarker);

	// Notify AddMarker method error.
	if(m_EJrn1.GetResultCode() != OPOS_SUCCESS)
	{
		CString	strTemp;
		CString	strErrMsg;
		strErrMsg  = _T("Failed to Add Marker.\n\n");
		strTemp.Format("%d", m_EJrn1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_EJrn1.GetResultCodeExtended() );
		strErrMsg += _T("ResultCodeExtended = ") + strTemp;
		MessageBox( strErrMsg );
	}
}

void CElectronicJournalDlg::OnButtonCancel() 
{
	// TODO: Add your control notification handler code here

	m_EJrn1.CancelPrintContent();

	// Notify CancelPrintContent method error.
	if(m_EJrn1.GetResultCode() != OPOS_SUCCESS)
	{
		CString	strTemp;
		CString	strErrMsg;
		strErrMsg  = _T("Failed to Cancel Print.\n\n");
		strTemp.Format("%d", m_EJrn1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_EJrn1.GetResultCodeExtended() );
		strErrMsg += _T("ResultCodeExtended = ") + strTemp;
		MessageBox( strErrMsg );
	}
	else
	{
		m_bEJAsyncPrinting = FALSE;
		// Leave suspend mode.
		GetDlgItem(IDC_BUTTON_SUSPEND)	->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_RESUME)	->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_CANCEL)	->EnableWindow(FALSE);
	}

}

void CElectronicJournalDlg::OnButtonFilechoose() 
{

	// Choose extracted file
	CString strPath;
	GetDlgItem(IDC_EDIT_PRINT_FILENAME)->GetWindowText(strPath);

	CFileDialog fdlg(TRUE, NULL, strPath, 0, 0, this);
	fdlg.m_ofn.lpstrInitialDir = ".";

	if(fdlg.DoModal() == IDOK)
	{
		GetDlgItem(IDC_EDIT_PRINT_FILENAME)->SetWindowText(fdlg.GetPathName());
	}
}

void CElectronicJournalDlg::OnButtonPrintReceipt() 
{
	// TODO: Add your control notification handler code here
	BOOL bExit;
	int i;
	long Spacing;
	long Height;
	long RotateType;
	CString ESC = "\x1b";
	CString fDate;
	CString sBuf;
	CString sRCE;
	CString BcData;
	bool bBitmapPrint;
	bool bBarcodePrint;

//Sets BitmapMode to NORMAL
	//long pData;
	//CString cString;
	//BSTR pString;

	if( m_Ptr1.GetCapRecPresent() == FALSE ) {
		MessageBox("This Printer doesn't have Receipt Station.");
		return;
	}

	if( m_Ptr1.GetCapRecLeft90() == FALSE ) {
		MessageBox("This printer doesn't have a rotation printing function.");
		return;
	}

	RotateType = 0;
	bBitmapPrint = false;
	bBarcodePrint = false;
	if (m_Ptr1.GetCapRecBitmap() != NULL)
	{
		if (strstr(m_Ptr1.GetRecBitmapRotationList(), "L90") != NULL)
		{
			RotateType = RotateType + PTR_RP_BITMAP;
			bBitmapPrint = true;
		}
	}
	if (m_Ptr1.GetCapRecBarCode() != NULL)
	{
		if (strstr(m_Ptr1.GetRecBarCodeRotationList(), "L90") != NULL)
		{
			RotateType = RotateType + PTR_RP_BARCODE;
			bBarcodePrint = true;
		}
	}


// Initialization
	CTime t = CTime::GetCurrentTime();
	fDate = t.Format("%B %d, %Y  %p %I:%M");
	bExit = FALSE;
	BcData = "4902720005074";

	//Batch processing mode
	m_Ptr1.TransactionPrint( PTR_S_RECEIPT, PTR_TP_TRANSACTION );
	if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
		MessageBox("Cannot use a POS Printer.");
		return;
	}
	//Rotate 90
	m_Ptr1.RotatePrint( PTR_S_RECEIPT, PTR_RP_LEFT90 + RotateType );

	//Loop
	while(1) {
		Spacing = m_Ptr1.GetRecLineSpacing();			//Keep the default line spacing
		Height = m_Ptr1.GetRecLineHeight();				//Keep the default line height
    
		//Printing process

	//Sets BitmapMode to NORMAL
		//pData = PTR_DI_BMP_NORMAL;
		//cString = "";
		//pString = cString.AllocSysString();
		//m_Ptr1.DirectIO( PTR_DI_SET_BITMAP_MODE, &pData, &pString );
		//SysFreeString( pString );

		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|4C" + ESC + "|bC   Receipt     ");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|3C" + ESC + "|2uC       Mr. Brawn\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|2uC" + "                                                             \n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|2uC" + ESC + "|3C        Total payment              $" + ESC + "|4C21.00  ");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|1C" + "\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, fDate + " Received\n\n");
		m_Ptr1.SetRecLineHeight( 24 );
		m_Ptr1.SetRecLineSpacing( m_Ptr1.GetRecLineHeight());
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|uC Detais               \n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|1C                          " + ESC + "|2COPOS Store\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|uC Tax excluded    $20.00\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|1C                          " + ESC + "|bCZip code 999-9999\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|uC Tax(5%)        $1.00" + ESC + "|N    Phone#(9999)99-9998\n\n");

		//When outputting normally,breakout of the loop.
		if( m_Ptr1.GetResultCode() == OPOS_SUCCESS )
			break;

		//When error occurs, display a message to ask the user whether retry or not.
		i = MessageBox("Fails to output to a printer.\n\nRetry?", "OPOS SUMPLE", MB_ABORTRETRYIGNORE + MB_ICONQUESTION);
		if( i != IDIGNORE )				// Not "Ignore" has been selected.
			m_Ptr1.ClearOutput();
		if( i == IDABORT )				// "Cancel"has been selected
			bExit = TRUE;
		if( i != IDRETRY )				// Not "Retry"has been selected.
			break;
	}

	m_Ptr1.RotatePrint( PTR_S_RECEIPT, PTR_RP_NORMAL );

	if( !bExit ) {
		if( m_Ptr1.GetResultCode() == OPOS_SUCCESS ) {
			sBuf.Format( "|%dlF", m_Ptr1.GetRecLinesToPaperCut());
			m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + sBuf);
			if( m_Ptr1.GetCapRecPapercut())
				m_Ptr1.CutPaper( 100 );
		}
		else {
			sBuf.Format("%ld", m_Ptr1.GetResultCode());
			sRCE.Format("%ld", m_Ptr1.GetResultCodeExtended());
			MessageBox("Cannot use a POS Printer\nResultCode = " + sBuf + "\nResultCodeExtended = " + sRCE );
			m_Ptr1.ClearOutput();
		}
	}

	m_Ptr1.SetRecLineSpacing( Spacing );
	m_Ptr1.SetRecLineHeight( Height );

	// Wait until device is 'OPOS_S_IDLE'
	while( m_Ptr1.GetState() != OPOS_S_IDLE )
		;
	//Print all the buffer data, and exit the batch processing mode.
	m_Ptr1.TransactionPrint( PTR_S_RECEIPT, PTR_TP_NORMAL );

	if(m_Ptr1.GetResultCode() != OPOS_SUCCESS)
	{
		sBuf.Format("%ld", m_Ptr1.GetResultCode());
		sRCE.Format("%ld", m_Ptr1.GetResultCodeExtended());
		MessageBox("Failed to Receipt print. \n\nResultCode = " + sBuf + "\nResultCodeExtended = " + sRCE );
	}
	m_Ptr1.ClearOutput();
}

void CElectronicJournalDlg::OnButtonPrintfile() 
{
	// TODO: Add your control notification handler code here

	CString strMarker;
	GetDlgItem(IDC_EDIT_PRINT_FILENAME)->GetWindowText(strMarker);

	m_EJrn1.PrintContentFile(strMarker);

	if(m_EJrn1.GetResultCode() != OPOS_SUCCESS)
	{
		// Notify PrintContentFile method error.
		CString	strTemp;
		CString	strErrMsg;
		strErrMsg  = _T("Failed to Print ElectronicJournalFile. \n\n");
		strTemp.Format("%d", m_EJrn1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_EJrn1.GetResultCodeExtended() );
		strErrMsg += _T("ResultCodeExtended = ") + strTemp;
		MessageBox( strErrMsg );
	}
	else
	{
		if(m_EJrn1.GetAsyncMode())
		{
			m_bEJAsyncPrinting = TRUE;
		}
	}

	if(m_bEJAsyncPrinting && m_bPtrRecNearEmpty)
	{
		GetDlgItem(IDC_BUTTON_SUSPEND)->EnableWindow(TRUE);
	}
}

void CElectronicJournalDlg::OnButtonQuery() 
{
	// TODO: Add your control notification handler code here
	CString strFileName;
	CString strStartMarker;
	CString strEndMarker;

	GetDlgItem(IDC_EDIT_QUERY_FILENAME)->GetWindowText(strFileName);
	GetDlgItem(IDC_EDIT_QUERY_SMARKER)->GetWindowText(strStartMarker);
	GetDlgItem(IDC_EDIT_QUERY_EMARKER)->GetWindowText(strEndMarker);

	m_EJrn1.QueryContent(strFileName, strStartMarker, strEndMarker);

	if(m_EJrn1.GetResultCode() != OPOS_SUCCESS)
	{
		// Notify QueryContent method error.
		CString	strTemp;
		CString	strErrMsg;
		strErrMsg  = _T("Failed to Create ElectronicJournalFile. \n\n");
		strTemp.Format("%d", m_EJrn1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_EJrn1.GetResultCodeExtended() );
		strErrMsg += _T("ResultCodeExtended = ") + strTemp;
		MessageBox( strErrMsg );
	}
}

void CElectronicJournalDlg::OnButtonResume() 
{
	// TODO: Add your control notification handler code here
	m_EJrn1.ResumePrintContent();

	if(m_EJrn1.GetResultCode() != OPOS_SUCCESS)
	{
		// Notify ResumePrintContent method error.
		CString	strTemp;
		CString	strErrMsg;
		strErrMsg  = _T("Failed to Resume print.\n\n");
		strTemp.Format("%d", m_EJrn1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_EJrn1.GetResultCodeExtended() );
		strErrMsg += _T("ResultCodeExtended = ") + strTemp;
		MessageBox( strErrMsg );
	}
	else
	{
		// Leave suspend mode.
		GetDlgItem(IDC_BUTTON_SUSPEND)->EnableWindow(TRUE);
		GetDlgItem(IDC_BUTTON_RESUME)->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_CANCEL)->EnableWindow(FALSE);
	}
}

void CElectronicJournalDlg::OnButtonStatsEj() 
{
	// TODO: Add your control notification handler code here
	CString strStatsParam;
	CString	strXMLPath;
	BSTR bstrStatsParam;

	GetDlgItem(IDC_EDIT_STATS_EJ)->GetWindowText(strStatsParam);
	bstrStatsParam = strStatsParam.AllocSysString();

	m_EJrn1.RetrieveStatistics(&bstrStatsParam);

	if(m_EJrn1.GetResultCode() != OPOS_SUCCESS)
	{
		// Notify RetrieveStatistics method error.
		CString	strTemp;
		CString	strErrMsg;
		strErrMsg  = _T("RetrieveStatistics method error.\n\n");
		strTemp.Format("%d", m_EJrn1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_EJrn1.GetResultCodeExtended() );
		strErrMsg += _T("ResultCodeExtended = ") + strTemp;
		MessageBox( strErrMsg );
	}
	else
	{
		strXMLPath = _T("SampleEJ.xml");
		strStatsParam = bstrStatsParam;

		CFile cfXMLFile( strXMLPath, CFile::modeCreate | CFile::modeWrite );
		strXMLPath = cfXMLFile.GetFilePath();
		cfXMLFile.Write( strStatsParam, strStatsParam.GetLength() );
		cfXMLFile.Close();

		// Opens another window and indicates the information of the XML file.
		CXMLView cxmlDlg;
		cxmlDlg.SetXMLFilePath( strXMLPath );
		cxmlDlg.DoModal();
	}

	::SysFreeString( bstrStatsParam );
}

void CElectronicJournalDlg::OnButtonStatsPtr() 
{
	// TODO: Add your control notification handler code here
	CString strStatsParam;
	CString	strXMLPath;
	BSTR bstrStatsParam;

	GetDlgItem(IDC_EDIT_STATS_PTR)->GetWindowText(strStatsParam);
	bstrStatsParam = strStatsParam.AllocSysString();

	m_Ptr1.RetrieveStatistics(&bstrStatsParam);

	if(m_Ptr1.GetResultCode() != OPOS_SUCCESS)
	{
		CString	strTemp;
		CString	strErrMsg;
		strErrMsg  = _T("RetrieveStatistics method error.\n\n");
		strTemp.Format("%d", m_EJrn1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_EJrn1.GetResultCodeExtended() );
		strErrMsg += _T("ResultCodeExtended = ") + strTemp;
		MessageBox( strErrMsg );
	}
	else
	{
		strXMLPath = _T("SamplePTR.xml");
		strStatsParam = bstrStatsParam;

		CFile cfXMLFile( strXMLPath, CFile::modeCreate | CFile::modeWrite );
		strXMLPath = cfXMLFile.GetFilePath();
		cfXMLFile.Write( strStatsParam, strStatsParam.GetLength() );
		cfXMLFile.Close();

		// Opens another window and indicates the information of the XML file.
		CXMLView cxmlDlg;
		cxmlDlg.SetXMLFilePath( strXMLPath );
		cxmlDlg.DoModal();
	}

	::SysFreeString( bstrStatsParam );
}

void CElectronicJournalDlg::OnButtonSuspend() 
{
	// TODO: Add your control notification handler code here
	m_EJrn1.SuspendPrintContent();

	if(m_EJrn1.GetResultCode() != OPOS_SUCCESS)
	{
		// Notify SuspendPrintContent method error.
		CString	strTemp;
		CString	strErrMsg;
		strErrMsg  = _T("Failed to Suspend print.\n\n");
		strTemp.Format("%d", m_EJrn1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_EJrn1.GetResultCodeExtended() );
		strErrMsg += _T("ResultCodeExtended = ") + strTemp;
		MessageBox( strErrMsg );
	}
}

void CElectronicJournalDlg::OnCheckAsync() 
{
	// TODO: Add your control notification handler code here
	BOOL bCheckState = FALSE;
	
	CButton* objCheckBox = (CButton*)GetDlgItem(IDC_CHECK_ASYNC);

	// Confirm AsyncMode property reflect
	if(objCheckBox->GetCheck())
	{
		bCheckState = TRUE;
	}

	m_EJrn1.SetAsyncMode(bCheckState);
}

void CElectronicJournalDlg::OnCheckDataevent() 
{
	// TODO: Add your control notification handler code here
	BOOL bCheckState = FALSE;

	CButton* objCheckBox = (CButton*)GetDlgItem(IDC_CHECK_DATAEVENT);

	// Confirm DataEventEnabled property reflect
	if(objCheckBox->GetCheck())
	{
		bCheckState = TRUE;
	}

	m_EJrn1.SetDataEventEnabled(bCheckState);

}

void CElectronicJournalDlg::OnCheckStorage() 
{
	// TODO: Add your control notification handler code here
	BOOL bCheckState = FALSE;

	CButton* objCheckBox = (CButton*)GetDlgItem(IDC_CHECK_STORAGE);

	// Confirm StorageEnabled property reflect
	if(objCheckBox->GetCheck())
	{
		bCheckState = TRUE;
	}

	m_EJrn1.SetStorageEnabled(bCheckState);

}

void CElectronicJournalDlg::OnClose() 
{
	// TODO: Add your control notification handler code here
    //Cancel the device
    m_Ptr1.SetDeviceEnabled( FALSE );

    //Release the device exclusive control right.
    //(Notice:When using an old CO, use the Release.)
    m_Ptr1.ReleaseDevice();

    //Finish using the device.
    m_Ptr1.Close();

    //Cancel the device
    m_EJrn1.SetDeviceEnabled( FALSE );

    //Release the device exclusive control right.
    //(Notice:When using an old CO, use the Release.)
    m_EJrn1.ReleaseDevice();

    //Finish using the device.
    m_EJrn1.Close();

	m_paDialogs.RemoveAll();

	CDialog::OnOK();
}

BEGIN_EVENTSINK_MAP(CElectronicJournalDlg, CDialog)
    //{{AFX_EVENTSINK_MAP(CElectronicJournalDlg)
	ON_EVENT(CElectronicJournalDlg, IDC_ELECTRONICJOURNAL1, 1 /* DataEvent */, OnDataEventElectronicjournal1, VTS_I4)
	ON_EVENT(CElectronicJournalDlg, IDC_ELECTRONICJOURNAL1, 3 /* ErrorEvent */, OnErrorEventElectronicjournal1, VTS_I4 VTS_I4 VTS_I4 VTS_PI4)
	ON_EVENT(CElectronicJournalDlg, IDC_ELECTRONICJOURNAL1, 4 /* OutputCompleteEvent */, OnOutputCompleteEventElectronicjournal1, VTS_I4)
	ON_EVENT(CElectronicJournalDlg, IDC_ELECTRONICJOURNAL1, 5 /* StatusUpdateEvent */, OnStatusUpdateEventElectronicjournal1, VTS_I4)
	ON_EVENT(CElectronicJournalDlg, IDC_POSPRINTER1, 5 /* StatusUpdateEvent */, OnStatusUpdateEventPosprinter1, VTS_I4)
	//}}AFX_EVENTSINK_MAP
END_EVENTSINK_MAP()

void CElectronicJournalDlg::OnDataEventElectronicjournal1(long Status) 
{
	// TODO: Add your control notification handler code here
	CString sStatus;
	sStatus.Format("%ld\n", Status );

    MessageBox("Complete Querying Content: Status = " + sStatus, "DataEvent", MB_ICONINFORMATION );

	CButton* pButton = (CButton*)GetDlgItem(IDC_CHECK_DATAEVENT);

	// If DataEvent occured, DataEventEnabled Property will be false,
	pButton->SetCheck(m_EJrn1.GetDataEventEnabled());
}

void CElectronicJournalDlg::OnErrorEventElectronicjournal1(long ResultCode, long ResultCodeExtended, long ErrorLocus, long FAR* pErrorResponse) 
{
	// TODO: Add your control notification handler code here

    // Handling error event to asynchronous print/query process.
	CString sRC;
	CString sRCE;

	sRC.Format("ResultCode = %ld\n", ResultCode );
	sRCE.Format("ResultCodeExtended = %ld\n", ResultCodeExtended );

    // Error from asynchronous print process.
	if(ErrorLocus == OPOS_EL_OUTPUT)
	{
		CErrorDialog edlg;
		edlg.m_strErrorMessage = "Output Error.\n\n" + sRC + sRCE;
		edlg.DoModal();

		switch(edlg.m_lErrorRecovery)
		{
		case CErrorDialog::ER_CANCEL:
            // Cancel asynchronous print
			*pErrorResponse = OPOS_ER_CLEAR;
			GetDlgItem(IDC_BUTTON_SUSPEND)->EnableWindow(FALSE);
			m_bEJAsyncPrinting = FALSE;
			break;

		case CErrorDialog::ER_RETRY:
            // Retry asynchronous print
			*pErrorResponse = OPOS_ER_RETRY;
			GetDlgItem(IDC_BUTTON_SUSPEND)->EnableWindow(TRUE);
			m_bEJAsyncPrinting = TRUE;
			break;

		case CErrorDialog::ER_SUSPEND:
            // Suspend asynchronous print
			m_EJrn1.SuspendPrintContent();
			*pErrorResponse = OPOS_ER_RETRY;
			m_bEJAsyncPrinting = FALSE;
			break;

		default:
			break;
		}
	}

    // Error from asynchronous query process.
	else if(ErrorLocus == OPOS_EL_INPUT_DATA)
	{
		CErrorDialog edlg;
		edlg.m_strErrorMessage = "InputData Error.\n\n" + sRC + sRCE;

		edlg.m_bSuspendButtonEnabled = FALSE;
		edlg.m_strRetryButtonCaption = "Continue Input";
		edlg.m_strCancelButtonCaption = "Clear";

		edlg.DoModal();

		switch(edlg.m_lErrorRecovery)
		{
		case CErrorDialog::ER_CANCEL:
            // Clear all input events.
			*pErrorResponse = OPOS_ER_CLEAR;
			break;

		default:
	        // Continue to receive input events.
			*pErrorResponse = OPOS_ER_CONTINUEINPUT;
			break;
		}
	}

	else if(ErrorLocus == OPOS_EL_INPUT)
	{
        // If ErrorLocus was OPOS_EL_INPUT, the event is Last input event.
        // ErrorResponse will unnecessary.
		CErrorDialog edlg;
		edlg.m_strErrorMessage = "Input Error.\n\n" + sRC + sRCE;

		edlg.m_bSuspendButtonEnabled = FALSE;
		edlg.m_strRetryButtonCaption = "Continue Input";
		edlg.m_bRetryButtonEnabled = FALSE;
		edlg.m_strCancelButtonCaption = "Clear";

		edlg.DoModal();
	}
}

void CElectronicJournalDlg::OnOutputCompleteEventElectronicjournal1(long OutputID) 
{
	// TODO: Add your control notification handler code here

	CString sID;
	sID.Format("Complete PrintContent file : ID = %ld\n", OutputID );

	COutputCompleteDialog* dlg = new COutputCompleteDialog();

	dlg->Create();
	dlg->SetMessage(sID);
	dlg->ShowWindow(SW_SHOW);

	m_paDialogs.Add(dlg);

	if(m_EJrn1.GetOutputID() == OutputID)
	{
		m_bEJAsyncPrinting = FALSE;
		GetDlgItem(IDC_BUTTON_SUSPEND)->EnableWindow(FALSE);
	}
}

void CElectronicJournalDlg::OnStatusUpdateEventElectronicjournal1(long Data) 
{
	// TODO: Add your control notification handler code here
	switch(Data)
	{
	case EJ_SUE_SUSPENDED:
		GetDlgItem(IDC_BUTTON_SUSPEND)->EnableWindow(FALSE);
		GetDlgItem(IDC_BUTTON_CANCEL)->EnableWindow(TRUE);
		GetDlgItem(IDC_BUTTON_RESUME)->EnableWindow(TRUE);
		break;
	case EJ_SUE_MEDIUM_NEAR_FULL:
		MessageBox("ElectronicJournal Medium Near Full.", "EJSample", MB_ICONINFORMATION );
		break;
	}
}

void CElectronicJournalDlg::OnStatusUpdateEventPosprinter1(long Data) 
{
	// TODO: Add your control notification handler code here
    switch(Data)
	{
		// Enabled SuspendPrintContent button for replace receipt paper.
	case PTR_SUE_REC_NEAREMPTY:
	    MessageBox("Receipt Station Paper Near End.", "EJSample", MB_ICONINFORMATION );
		m_bPtrRecNearEmpty = TRUE;
		if(m_bEJAsyncPrinting)
		{
			GetDlgItem(IDC_BUTTON_SUSPEND)->EnableWindow(TRUE);
		}
		break;
	case PTR_SUE_REC_PAPEROK:
		m_bPtrRecNearEmpty = FALSE;
		break;
	}
}

