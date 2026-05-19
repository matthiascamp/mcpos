// chkScanDlg.cpp : implementation file
//

#include "stdafx.h"
#include "chkScan.h"
#include "chkScanDlg.h"
#include "XMLView.h"
#include "Opos.h"
#include "Epson.h"
#include "EpsnCScn.h"
#include "OPOSChk.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#undef THIS_FILE
static char THIS_FILE[] = __FILE__;
#endif

struct SUPPORTLIST
{
	long lValue[3];
	CString strValue[3];
	CString m_strCurrentMode;
} CheckList;

/////////////////////////////////////////////////////////////////////////////
// CChkScanDlg dialog

CChkScanDlg::CChkScanDlg(CWnd* pParent /*=NULL*/)
	: CDialog(CChkScanDlg::IDD, pParent)
{
	//{{AFX_DATA_INIT(CChkScanDlg)
	//}}AFX_DATA_INIT
	// Note that LoadIcon does not require a subsequent DestroyIcon in Win32
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
}

void CChkScanDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	//{{AFX_DATA_MAP(CChkScanDlg)
	DDX_Control(pDX, IDC_EDIT_RETRIEVST, m_edtRetrieveSt);
	DDX_Control(pDX, IDC_CMB_CM, m_CmbChangeMode);
	DDX_Control(pDX, IDC_CHECKSCANNER1, m_Cochkscan1);
	DDX_Control(pDX, IDC_MICR1, m_Comicr1);
	//}}AFX_DATA_MAP
}

BEGIN_MESSAGE_MAP(CChkScanDlg, CDialog)
	//{{AFX_MSG_MAP(CChkScanDlg)
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	ON_BN_CLICKED(IDC_BTN_CREATEF, OnBtnCreatef)
	ON_BN_CLICKED(IDCANCEL, OnClose)
	ON_BN_CLICKED(IDC_RDO_CROP1, OnRdoCrop1)
	ON_BN_CLICKED(IDC_RDO_CROP2, OnRdoCrop2)
	ON_BN_CLICKED(IDC_RDO_CROP3, OnRdoCrop3)
	ON_BN_CLICKED(IDC_BTN_READ, OnBtnRead)
	ON_BN_CLICKED(IDC_BTN_MICRATTACH, OnBtnMicrattach)
	ON_BN_CLICKED(IDC_BTN_READMEMORY, OnBtnReadmemory)
	ON_BN_CLICKED(IDC_BTN_STORE, OnBtnStore)
	ON_CBN_SELCHANGE(IDC_CMB_CM, OnSelchangeCmbCm)
	ON_BN_CLICKED(IDC_BTN_RETRIEVST, OnBtnRetrievSt)
	//}}AFX_MSG_MAP
END_MESSAGE_MAP()

/////////////////////////////////////////////////////////////////////////////
// CChkScanDlg message handlers

BOOL CChkScanDlg::OnInitDialog()
{
	CDialog::OnInitDialog();

	// Set the icon for this dialog.  The framework does this automatically
	//  when the application's main window is not a dialog
	SetIcon(m_hIcon, TRUE);			// Set big icon
	SetIcon(m_hIcon, FALSE);		// Set small icon
	
	// TODO: Add extra initialization here
	CString strSupportMode;
	CString strListString;
	CString strGetListData;
	long lSupportMode;
	long lCount;
	BSTR strDum;

	m_iCropAreaIndex = 1;
	m_lImgFormat = 0;

	BOOL bError = FALSE;
	m_blnMicrEvent = FALSE;

	//Initialize
	CheckList.lValue[0] = CHK_DI_CHECKSCANNER;	CheckList.strValue[0] = "CheckScanner";
	CheckList.lValue[1] = CHK_DI_CARDSCANNER;	CheckList.strValue[1] = "CardScanner";
	CheckList.lValue[2] = CHK_DI_TMSTORAGE;

	while( 1 )
	{
		//Open the device
		//Use a Logical Device Name which has been set on the SetupPOS.
		m_Cochkscan1.Open("Unit1");
		//Check whether the device is succeed to open, or not
		if( m_Cochkscan1.GetResultCode() != OPOS_SUCCESS )
		{
			MessageBox("This device has not been registered, or cannot use.");
			bError = TRUE;
			break;
		}

        //Get the exclusive control right for the opened device.
        //Then the device is disable from other application.
        //(Notice:When using an old CO, use the Claim.)
		m_Cochkscan1.ClaimDevice( 1000 );
        if( m_Cochkscan1.GetResultCode() != OPOS_SUCCESS )
		{
            MessageBox("Fails to get the exclusive right for the device.");
			bError = TRUE;
			break;
        }

		// If support the CapPowerReporting, enable the Power Reporting Requirements.
		if( m_Cochkscan1.GetCapPowerReporting() != OPOS_PR_NONE )
			m_Cochkscan1.SetPowerNotify( OPOS_PN_ENABLED );

        //Enable the device.
		m_Cochkscan1.SetDeviceEnabled( TRUE );
		//Check whether the device is enable to use, or not
		if( m_Cochkscan1.GetResultCode() != OPOS_SUCCESS )
		{
			MessageBox("Now the device is disable to use.");
			bError = TRUE;
			break;
		}

		m_Cochkscan1.DirectIO (CHK_DI_GET_SUPPORT_FUNCTION, &lSupportMode, &strDum);

		for(lCount = 2; lCount >= 0; lCount--)
		{
			if (CheckList.lValue[lCount] <= lSupportMode){
				lSupportMode = lSupportMode - CheckList.lValue[lCount];
				switch (lCount){
					case 0:
						strListString = CheckList.strValue[lCount];
						m_CmbChangeMode.InsertString(0, strListString);
						GetDlgItem(IDC_BTN_MICRATTACH)->EnableWindow(TRUE);
						break;
					case 1:
						strListString = CheckList.strValue[lCount];
						m_CmbChangeMode.InsertString(0, strListString);
						GetDlgItem(IDC_BTN_MICRATTACH)->EnableWindow(FALSE);
						break;
				}
			}
		}
		m_CmbChangeMode.SetCurSel(0);
		CheckList.m_strCurrentMode = strGetListData;
               
		//lSupportMode = CHK_DI_SHARPNESS_ON;
        //m_Cochkscan1.DirectIO(CHK_DI_SHARPNESS_IMAGE, &lSupportMode, &strDum);
        
		// Set the edit box of parameter input.
		CString	strParam = _T("ModelName,HoursPoweredCount");
		m_edtRetrieveSt.SetWindowText( strParam );

		// Checks whether it has function to obtain 
		// the statistics of devices.
		// If it does not have the function, invalidates
		// the [Retrieve Statistics] button and the edit box
		// of parameter input.
		if( !m_Cochkscan1.GetCapStatisticsReporting() )
		{	// CapStatisticsReporting = FALSE
			GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
		}

		// Open the OPOSMicr
		m_bMICRError = FALSE;
		m_Comicr1.Open("Unit1");
		if( m_Comicr1.GetResultCode() != OPOS_SUCCESS )
		{
			MessageBox("This device has not been registered, or cannot use.");
			m_bMICRError = TRUE;
			break;
		}
		m_Comicr1.ClaimDevice( 1000 );
        if( m_Comicr1.GetResultCode() != OPOS_SUCCESS )
		{
            MessageBox("Fails to get the exclusive right for the device.");
			m_bMICRError = TRUE;
			break;
        }

		m_Comicr1.SetDeviceEnabled( TRUE );
		if( m_Comicr1.GetResultCode() != OPOS_SUCCESS )
		{
			MessageBox("Now the device is disable to use.");
			m_bMICRError = TRUE;
			break;
		}

		break;
	}

	//Read TIFF file
	m_Cochkscan1.SetImageFormat(CHK_IF_TIFF);

	//Read BMP file
	//m_Cochkscan1.SetImageFormat(CHK_IF_BMP);

	//Read JPEG file
	//m_Cochkscan1.SetImageFormat(CHK_IF_JPEG);
	
	m_cscnPath = ".\\Sample.bmp";
	if(m_Cochkscan1.GetImageFormat() == CHK_IF_TIFF)
	{
		m_cscnPath = ".\\Sample.tif";
	}
	if(m_Cochkscan1.GetImageFormat() == CHK_IF_BMP)
	{
		m_cscnPath = ".\\Sample.bmp";
	}
	if(m_Cochkscan1.GetImageFormat() == CHK_IF_JPEG)
	{
		m_cscnPath = ".\\Sample.jpg";
	}

	m_lImgFormat = m_Cochkscan1.GetImageFormat();

	if( bError )
	{
		//Disable all buttons
		AllHide();
	}
	if( m_bMICRError )
	{
		GetDlgItem(IDC_BTN_MICRATTACH)->EnableWindow(FALSE);
	}
	
	//Disable CroppingAreaGroup
	GetDlgItem(IDC_STC_CA)->EnableWindow(FALSE);
	
	//Disable CropAreaRenge
	GetDlgItem(IDC_RDO_CROP1)->EnableWindow(FALSE);
	GetDlgItem(IDC_RDO_CROP2)->EnableWindow(FALSE);
	GetDlgItem(IDC_RDO_CROP3)->EnableWindow(FALSE);
	
	//Disable create file
	GetDlgItem(IDC_BTN_CREATEF)->EnableWindow(FALSE);

	//Disable "Store" button
	GetDlgItem(IDC_BTN_STORE)->EnableWindow(FALSE);

	return TRUE;  // return TRUE  unless you set the focus to a control
}

// If you add a minimize button to your dialog, you will need the code below
//  to draw the icon.  For MFC applications using the document/view model,
//  this is automatically done for you by the framework.

void CChkScanDlg::OnPaint() 
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
HCURSOR CChkScanDlg::OnQueryDragIcon()
{
	return (HCURSOR) m_hIcon;
}

BEGIN_EVENTSINK_MAP(CChkScanDlg, CDialog)
    //{{AFX_EVENTSINK_MAP(CChkScanDlg)
	ON_EVENT(CChkScanDlg, IDC_CHECKSCANNER1, 1 /* DataEvent */, OnDataEventCheckscanner1, VTS_I4)
	ON_EVENT(CChkScanDlg, IDC_CHECKSCANNER1, 3 /* ErrorEvent */, OnErrorEventCheckscanner1, VTS_I4 VTS_I4 VTS_I4 VTS_PI4)
	ON_EVENT(CChkScanDlg, IDC_MICR1, 1 /* DataEvent */, OnDataEventMicr1, VTS_I4)
	ON_EVENT(CChkScanDlg, IDC_MICR1, 3 /* ErrorEvent */, OnErrorEventMicr1, VTS_I4 VTS_I4 VTS_I4 VTS_PI4)
	//}}AFX_EVENTSINK_MAP
END_EVENTSINK_MAP()


void CChkScanDlg::OnBtnCreatef() 
{
	CString strTemp;//Temp string
	CString strTr;//Input string
	CString strImageHead;//Path
	CByteArray byteTr;//Input byte
	unsigned char cHigh;//byte high
	unsigned char cLow;//byte low
	long rtNext = 0;//See part of 2byte and start position
	long rtDataSize;//DataSize
	long lHigh;
	long lLow;

	m_Cochkscan1.SetBinaryConversion(OPOS_BC_NIBBLE);
	strTemp = m_Cochkscan1.GetImageData();
	
	//GetImageSize;
	rtDataSize = GetDataSize();

	byteTr.SetSize(rtDataSize);
	for(long i = 0;i < rtDataSize;i++)
	{
		cHigh = strTemp.GetAt(rtNext);
		cLow = strTemp.GetAt(rtNext+1);
		lHigh = cHigh & 0x0F;
		lLow = cLow & 0x0F;
		rtNext = rtNext + 2;
		byteTr.SetAt(i,(BYTE)(lHigh * 16 + lLow));
	}

	ImCreateFile(m_cscnPath);
	ImWriteFile(m_cscnPath,&byteTr,rtDataSize);
	
	GetDlgItem(IDC_BTN_CREATEF)->EnableWindow(FALSE);
    MessageBox("A file was created");
}
void CChkScanDlg::ImCreateFile(CString fPath)
{
	CFile m_ImCfile;
	CFileException e;
	//Create File
	m_ImCfile.Open(fPath,CFile::modeCreate,&e);
	m_ImCfile.Close();
}
void CChkScanDlg::ImWriteFile(CString fPath,CByteArray* fData,long fSize)
{
	//Write File
	CFile m_ImWfile;
	CFileException e;

	m_ImWfile.Open(fPath,CFile::modeWrite,&e);
	m_ImWfile.Write(fData->GetData(),fSize);
	m_ImWfile.Close();
}

long CChkScanDlg::GetDataSize()
{
	CString strIMSizeData;

	long lImageDataSize=0;
	long lNowBinaryConversion;

	//Now BinaryConversion
    lNowBinaryConversion = m_Cochkscan1.GetBinaryConversion();

	m_Cochkscan1.SetBinaryConversion(OPOS_BC_NIBBLE);

	//Copy to ImageData
    strIMSizeData = m_Cochkscan1.GetImageData();
	
	lImageDataSize = strIMSizeData.GetLength() / 2;

	//Re BinaryConversion
    m_Cochkscan1.SetBinaryConversion(lNowBinaryConversion);

	//Return ImageDataSize
	return lImageDataSize;

}

void CChkScanDlg::OnClose() 
{
    
        //Cancel the device
        m_Cochkscan1.SetDeviceEnabled(FALSE);
        
        //Release the device exclusive control right.
        //(Notice:When using an old CO, use the Release.)
        m_Cochkscan1.ReleaseDevice();
        
        //Finish using the device.
        m_Cochkscan1.Close();
    
        //Cancel the device
        m_Comicr1.SetDeviceEnabled(FALSE);
        
        //Release the device exclusive control right.
        //(Notice:When using an old CO, use the Release.)
        m_Comicr1.ReleaseDevice();
        
        //Finish using the device.
        m_Comicr1.Close();

		CDialog::OnCancel();

}




void CChkScanDlg::AllHide()
{

	GetDlgItem(IDC_STC_CA)->EnableWindow(FALSE);
	GetDlgItem(IDC_RDO_CROP1)->EnableWindow(FALSE);
	GetDlgItem(IDC_RDO_CROP2)->EnableWindow(FALSE);
	GetDlgItem(IDC_RDO_CROP3)->EnableWindow(FALSE);

	GetDlgItem(IDC_BTN_READ)->EnableWindow(FALSE);
	GetDlgItem(IDC_BTN_MICRATTACH)->EnableWindow(FALSE);
	GetDlgItem(IDC_BTN_READMEMORY)->EnableWindow(FALSE);
	GetDlgItem(IDC_BTN_STORE)->EnableWindow(FALSE);
	GetDlgItem(IDC_BTN_CREATEF)->EnableWindow(FALSE);
	GetDlgItem(IDC_BTN_MICRATTACH)->EnableWindow(FALSE);
	GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);

	GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
	GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);

	GetDlgItem(IDC_STC_DS)->EnableWindow(FALSE);
	GetDlgItem(IDC_STC_RESTESTI)->EnableWindow(FALSE);
	
	GetDlgItem(IDC_STC_CA)->EnableWindow(FALSE);
	GetDlgItem(IDC_RDO_CROP1)->EnableWindow(FALSE);
	GetDlgItem(IDC_RDO_CROP2)->EnableWindow(FALSE);
	GetDlgItem(IDC_RDO_CROP3)->EnableWindow(FALSE);

	GetDlgItem(IDC_STC_CM)->EnableWindow(FALSE);
	GetDlgItem(IDC_CMB_CM)->EnableWindow(FALSE);

	
}


void CChkScanDlg::OnRdoCrop1() 
{
	CString strDatasize;//DataSize
	
	//Ready to fired event
	m_Cochkscan1.SetDataEventEnabled(TRUE);
	
	m_iCropAreaIndex = 1;
	m_Cochkscan1.DefineCropArea(m_iCropAreaIndex,0,0,CHK_CROP_AREA_RIGHT,CHK_CROP_AREA_BOTTOM);
	m_Cochkscan1.RetrieveImage(m_iCropAreaIndex);
	
}

void CChkScanDlg::OnRdoCrop2() 
{
	CString strDatasize;//DataSize
	
	//Ready to fired event
	m_Cochkscan1.SetDataEventEnabled(TRUE);

	m_iCropAreaIndex = 2;

	m_Cochkscan1.DefineCropArea(m_iCropAreaIndex,3500,2244,2000,456);
	m_Cochkscan1.RetrieveImage(m_iCropAreaIndex);
}

void CChkScanDlg::OnRdoCrop3() 
{
	//CString strDatasize;//DataSize
	
	//Ready to fired event
	m_Cochkscan1.SetDataEventEnabled(TRUE);

	m_iCropAreaIndex = 3;

	m_Cochkscan1.DefineCropArea(m_iCropAreaIndex,5100,236,490,214);
	m_Cochkscan1.RetrieveImage(m_iCropAreaIndex);
}

void CChkScanDlg::OnBtnRead() 
{
	long lRet;

	//Clear displayed "DataSize"
	GetDlgItem(IDC_STC_IMBYTE)->SetWindowText(_T(""));

	//EventClear
	m_Cochkscan1.ClearInput();

	//Ready to fired event.
	m_Cochkscan1.SetDataEventEnabled(TRUE);
	
	//When Contrast property is used.
//	m_Cochkscan1.SetColor(CHK_CL_GRAYSCALE);
//	m_Cochkscan1.SetContrast(0); //lightest image (0-49)
////	m_Cochkscan1.SetContrast(50); //default
////	m_Cochkscan1.SetContrast(90); //darkest image (51-100)
        
    //Add timeout function.
	while (m_Cochkscan1.BeginInsertion(3000) == OPOS_E_TIMEOUT)
	{
		lRet = MessageBox("Please insert a check.", "Read", MB_ICONINFORMATION | MB_RETRYCANCEL );
		if( lRet == IDCANCEL )
		{
			m_Cochkscan1.EndInsertion();
			return;
		}

	}
    
    //Set paper & Scanning
    m_Cochkscan1.EndInsertion();

	//Call to retrieve an image to the ImageData proparty
    m_Cochkscan1.RetrieveImage(CHK_CROP_AREA_ENTIRE_IMAGE);

	if(m_Cochkscan1.GetResultCode() == OPOS_SUCCESS)
	{
		CButton *btnCrop1=(CButton*)GetDlgItem(IDC_RDO_CROP1);
		CButton *btnCrop2=(CButton*)GetDlgItem(IDC_RDO_CROP2);
		CButton *btnCrop3=(CButton*)GetDlgItem(IDC_RDO_CROP3);
		//Enable CroppingAreaGroup
		GetDlgItem(IDC_STC_CA)->EnableWindow(TRUE);
	
		//Enable CropAreaRenge
		GetDlgItem(IDC_RDO_CROP1)->EnableWindow(TRUE);
		GetDlgItem(IDC_RDO_CROP2)->EnableWindow(TRUE);
		GetDlgItem(IDC_RDO_CROP3)->EnableWindow(TRUE);
	
		btnCrop1->SetCheck(1);
		btnCrop2->SetCheck(0);
		btnCrop3->SetCheck(0);
		OnRdoCrop1();
	}

}

void CChkScanDlg::OnBtnMicrattach() 
{

	CString strReadRange;		//DirectIO read range
	BSTR strReadR;
	BSTR strReadM;
    long lReadData;				//DirectIO data "ECHK_DI_EXTEND_PRESCAN"Or"ECHK_DI_EXTEND_READAREA" Or "ECHK_DI_EXTEND_ATTACHED"
    BSTR strDum;				//DirectIO dummy data
    long lDum;					//DirectIO dummy data
	MSG msgDo;
	long lRet;
    
    //Clear displayed "DataSize"
    GetDlgItem(IDC_STC_IMBYTE)->SetWindowText(_T(""));
    
    //Ready to fired event
    m_Comicr1.SetDataEventEnabled(TRUE);
    
	if(m_blnMicrEvent)
	{
		return;
	}
    m_strMicrData = "DefaultData";

	//Add timeout function.
	while (m_Comicr1.BeginInsertion(3000) == OPOS_E_TIMEOUT)
	{
		lRet = MessageBox("Please insert a check.", "Attached MICR data", MB_ICONINFORMATION | MB_RETRYCANCEL );
		if( lRet == IDCANCEL )
		{
			m_Comicr1.EndInsertion();
			return;
		}
	}
	
	//Set paper
	m_Comicr1.EndInsertion();
    
	
	while (!m_blnMicrEvent)
	{
		if(::PeekMessage(&msgDo,NULL,0,0,PM_REMOVE))
		{
			::TranslateMessage(&msgDo);
			::DispatchMessage(&msgDo);
		}
	}
        
    /////////////////CheckScanner Section

	m_Cochkscan1.SetDocumentHeight(2756);
	m_Cochkscan1.SetDocumentWidth(5984);
	
	strReadRange = "197,0,5984,2756";
	strReadR = strReadRange.AllocSysString();
	strReadM = m_strMicrData.AllocSysString();
    
    lReadData = ECHK_DI_EXTEND_READAREA + ECHK_DI_EXTEND_ATTACHED + ECHK_DI_EXTEND_PRESCAN;
            
    m_Cochkscan1.DirectIO(ECHK_DI_READ_AREA, &lDum, &strReadR);

	m_Cochkscan1.DirectIO(ECHK_DI_ATTACHED_DATA, &lDum, &strReadM);

	m_Cochkscan1.DirectIO(ECHK_DI_ENDINSERTION_EXTEND, &lReadData, &strDum);
	
	//Ready to fired event
	m_Cochkscan1.SetDataEventEnabled(TRUE);
	
	//Read TIFF file
    m_Cochkscan1.SetImageFormat(CHK_IF_TIFF);

	//Set paper & Scanning
	m_Cochkscan1.BeginInsertion(3000);
    m_Cochkscan1.EndInsertion();
            
    //Call to retrieve an image to the ImageData proparty
    m_Cochkscan1.RetrieveImage(CHK_CROP_AREA_ENTIRE_IMAGE);

	if(m_Cochkscan1.GetResultCode() == OPOS_SUCCESS)
	{
		CButton *btnCrop1=(CButton*)GetDlgItem(IDC_RDO_CROP1);
		CButton *btnCrop2=(CButton*)GetDlgItem(IDC_RDO_CROP2);
		CButton *btnCrop3=(CButton*)GetDlgItem(IDC_RDO_CROP3);
		//Enable CroppingAreaGroup
		GetDlgItem(IDC_STC_CA)->EnableWindow(TRUE);
	
		//Enable CropAreaRenge
		GetDlgItem(IDC_RDO_CROP1)->EnableWindow(TRUE);
		GetDlgItem(IDC_RDO_CROP2)->EnableWindow(TRUE);
		GetDlgItem(IDC_RDO_CROP3)->EnableWindow(TRUE);
	
		btnCrop1->SetCheck(1);
		btnCrop2->SetCheck(0);
		btnCrop3->SetCheck(0);
		OnRdoCrop1();
	}

    //Clear DirectIO setting area
    lReadData = ECHK_DI_EXTEND_DEFAULT;
    m_Cochkscan1.DirectIO(ECHK_DI_ENDINSERTION_EXTEND, &lReadData, &strDum);
	
    m_blnMicrEvent = FALSE;
	
}

void CChkScanDlg::OnBtnReadmemory() 
{
	CString strStepData;
	CString strRIE;
    
	strStepData = "Epson CheckScanner SampleProgram";
    
    //Ready to fired event
	m_Cochkscan1.SetDataEventEnabled(TRUE);
        
    m_Cochkscan1.SetFileID(strStepData);
        
    //Speciffic "FileID"
    m_Cochkscan1.RetrieveMemory(CHK_LOCATE_BY_FILEID);
        
    m_Cochkscan1.ClearImage(CHK_CLR_BY_FILEID);
        
    //Displayed "rest number"
	strRIE.Format("%d",m_Cochkscan1.GetRemainingImagesEstimate());
	
	GetDlgItem(IDC_STC_ESTI)->SetWindowText(_T(strRIE));
    
	if(OPOS_SUCCESS != m_Cochkscan1.GetResultCode())
	{
		//Error MessageBox
		MessageBox(_T("NoData!"));
	}
	else
	{
		//Disable "CroppingArea" Group
		GetDlgItem(IDC_STC_CA)->EnableWindow(FALSE);
		
		//Disable "Renge" Option
		GetDlgItem(IDC_RDO_CROP1)->EnableWindow(FALSE);
		GetDlgItem(IDC_RDO_CROP2)->EnableWindow(FALSE);
		GetDlgItem(IDC_RDO_CROP3)->EnableWindow(FALSE);
	}
	
}

void CChkScanDlg::OnBtnStore() 
{
	CString strRIE;

    //Set FileID
	m_Cochkscan1.SetFileID("Epson CheckScanner SampleProgram");
    
    //Set FileID
    m_Cochkscan1.SetImageTagData("Epson CheckScanner SampleProgram ImageTagData");
    
    //Clear Image Data File
    m_Cochkscan1.ClearImage(CHK_CLR_BY_FILEID);
        
    //StoreImage
    m_Cochkscan1.StoreImage(m_iCropAreaIndex);
        
	//Displayed "rest number"
	strRIE.Format("%d",m_Cochkscan1.GetRemainingImagesEstimate());
	
	GetDlgItem(IDC_STC_ESTI)->SetWindowText(_T(strRIE));

    MessageBox(_T("A data was stored."));

}


///MICR Event
void CChkScanDlg::OnDataEventMicr1(long Status) 
{
	//End Doevents
    m_blnMicrEvent = TRUE;
    
    //Set "MICR RawData"
    m_strMicrData = m_Comicr1.GetRawData();
	
}

void CChkScanDlg::OnErrorEventMicr1(long ResultCode, long ResultCodeExtended, long ErrorLocus, long FAR* pErrorResponse) 
{
	CString strRC;
	CString strRCE;
	CString strMsg;

	strRC.Format("%d",ResultCode);
	strRCE.Format("%d",ResultCodeExtended);

	//Begin removal
    if( ResultCode == OPOS_E_ILLEGAL)
	{
		m_Comicr1.BeginRemoval(OPOS_FOREVER);
		m_Comicr1.EndRemoval();
	}

	//Error MessageBox
	strMsg = "MICR Error!\n\nResultCode = " + strRC + "\nResultCodeExtended = " + strRCE;
    MessageBox(strMsg);
	
	
    
    //Begin removal
    //Remove paper
    if (m_Comicr1.GetResultCode() == OPOS_E_ILLEGAL)
	{
		m_Comicr1.BeginRemoval(OPOS_FOREVER);
		m_Comicr1.EndRemoval();
	}
    
    //End Doevents
    m_blnMicrEvent = TRUE;
    
    //Set "ErrorData"
    m_strMicrData = "ErrorData";


}

void CChkScanDlg::OnDataEventCheckscanner1(long Status) 
{

	CString strDataSize;

	//Ready to fired event
    m_Cochkscan1.SetDataEventEnabled(TRUE);
    
    //Dispay ImageDataSize
	strDataSize.Format("%d",GetDataSize());
	strDataSize = strDataSize + " byte";
	GetDlgItem(IDC_STC_IMBYTE)->SetWindowText(strDataSize);
    
    //Enable "Store" button
    GetDlgItem(IDC_BTN_STORE)->EnableWindow(TRUE);
    
    //Enable "CreateFile" button
    GetDlgItem(IDC_BTN_CREATEF)->EnableWindow(TRUE);
	
}

void CChkScanDlg::OnErrorEventCheckscanner1(long ResultCode, long ResultCodeExtended, long ErrorLocus, long FAR* pErrorResponse) 
{
	// TODO: Add your control notification handler code here
	CString strRC;
	CString strRCE;
	CString strMsg;

	strRC.Format("%d",ResultCode);
	strRCE.Format("%d",ResultCodeExtended);

	//Begin removal
    if( ResultCode == OPOS_E_ILLEGAL)
	{
		m_Cochkscan1.BeginRemoval(OPOS_FOREVER);
		m_Cochkscan1.EndRemoval();
	}

	//Error MessageBox
	strMsg = "CheckScanner Error!\n\nResultCode = " + strRC + "\nResultCodeExtended = " + strRCE;
    MessageBox(strMsg);

    //Begin removal
    if (m_Cochkscan1.GetResultCode() == OPOS_E_ILLEGAL)
	{
		m_Cochkscan1.BeginRemoval(OPOS_FOREVER);
	}	
}

void CChkScanDlg::OnSelchangeCmbCm() 
{
	CString strChangeData;
	BSTR strDum;
	long lSetMode;
	long lIndex;
	BOOL bAtMicr;

	m_CmbChangeMode.GetWindowText(strChangeData);

	if (CheckList.m_strCurrentMode == strChangeData){
		return;
	}

	if (strChangeData == CheckList.strValue[0]){
		lSetMode = CHK_DI_MODE_CHECKSCANNER;
		if (!m_bMICRError){
			bAtMicr = TRUE;
		}
		else{
			bAtMicr = FALSE;
		}
	}
	else{
		if (strChangeData == CheckList.strValue[1]){
			lSetMode = CHK_DI_MODE_CARDSCANNER;
			bAtMicr = FALSE;
		}
	}

	m_Cochkscan1.DirectIO (CHK_DI_CHANGE_MODE, &lSetMode, &strDum);
    if (m_Cochkscan1.GetResultCode() != OPOS_SUCCESS){
		for (lIndex = 0; lIndex <= 2; lIndex++){
			if (CheckList.strValue[lIndex] == CheckList.m_strCurrentMode){
				m_CmbChangeMode.SetCurSel(lIndex);
			}
		}
		return;
	}
	else{
		GetDlgItem(IDC_BTN_MICRATTACH)->EnableWindow(bAtMicr);
		CheckList.m_strCurrentMode = strChangeData;
    }

	m_Cochkscan1.SetImageFormat(m_lImgFormat);

	if(m_Cochkscan1.GetImageFormat() == CHK_IF_TIFF)
	{
		m_cscnPath = ".\\Sample.tif";
	}
	if(m_Cochkscan1.GetImageFormat() == CHK_IF_BMP)
	{
		m_cscnPath = ".\\Sample.bmp";
	}
	if(m_Cochkscan1.GetImageFormat() == CHK_IF_JPEG)
	{
		m_cscnPath = ".\\Sample.jpg";
	}

}

void CChkScanDlg::OnBtnRetrievSt() 
{
	CString	strParam;
	CString	strErrMsg;
	CString	strXMLPath;
	BSTR	bstrParam;

    m_edtRetrieveSt.GetWindowText(strParam);
    strErrMsg.Empty();
	bstrParam = strParam.AllocSysString();

	// Obtains the statistics of the device and stores it in a file.
	m_Cochkscan1.RetrieveStatistics( &bstrParam );
	if( m_Cochkscan1.GetResultCode() != OPOS_SUCCESS )
	{
		CString	strTemp;
		strErrMsg  = _T("RetrieveStatistics method error.\n\n");
		strTemp.Format("%d", m_Cochkscan1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_Cochkscan1.GetResultCodeExtended() );
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
