VERSION 5.00
Object = "{CCB90110-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSMICR.ocx"
Object = "{CCB90230-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSCheckScanner.ocx"
Begin VB.Form Step7 
   BorderStyle     =   4  'Fixed ToolWindow
   Caption         =   "Step 7 Obtains the statistics of the device."
   ClientHeight    =   6030
   ClientLeft      =   45
   ClientTop       =   285
   ClientWidth     =   7020
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   6030
   ScaleWidth      =   7020
   ShowInTaskbar   =   0   'False
   Begin VB.Frame Frame5 
      Caption         =   "Device Statistics"
      Height          =   1440
      Left            =   3480
      TabIndex        =   17
      Top             =   3960
      Width           =   3000
      Begin VB.TextBox txtRetrieveSt 
         Height          =   285
         Left            =   100
         TabIndex        =   19
         Top             =   530
         Width           =   2775
      End
      Begin VB.CommandButton cmdRetrieveSt 
         Caption         =   "Retrieve Statistics"
         Height          =   435
         Left            =   100
         TabIndex        =   18
         Top             =   870
         Width           =   2775
      End
      Begin VB.Label Label6 
         Caption         =   "RetrieveStatistics parameter"
         Height          =   255
         Left            =   100
         TabIndex        =   20
         Top             =   300
         Width           =   2775
      End
   End
   Begin VB.ComboBox Combo2 
      Height          =   315
      Left            =   3480
      Style           =   2  'Dropdown List
      TabIndex        =   16
      Top             =   3420
      Width           =   3300
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Read"
      Height          =   510
      Left            =   210
      TabIndex        =   12
      Top             =   870
      Width           =   2745
   End
   Begin VB.CommandButton Command4 
      Caption         =   "Attached MICR data"
      Height          =   510
      Left            =   210
      TabIndex        =   11
      Top             =   1485
      Width           =   2745
   End
   Begin VB.CommandButton Command3 
      Caption         =   "CreateFile"
      Height          =   510
      Left            =   210
      TabIndex        =   10
      Top             =   2730
      Width           =   2745
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Exit"
      Height          =   420
      Left            =   5880
      TabIndex        =   9
      Top             =   5500
      Width           =   945
   End
   Begin VB.CommandButton Command5 
      Caption         =   "Read memory data"
      Height          =   510
      Left            =   3480
      TabIndex        =   8
      Top             =   2730
      Width           =   1845
   End
   Begin VB.CommandButton Command2 
      Caption         =   "Store"
      Height          =   510
      Left            =   210
      TabIndex        =   7
      Top             =   2100
      Width           =   2745
   End
   Begin VB.Frame Frame1 
      Caption         =   "Cropping area"
      Height          =   1755
      Left            =   3480
      TabIndex        =   3
      Top             =   870
      Width           =   3300
      Begin VB.OptionButton Option1 
         Caption         =   "Part of number (5100,236,490,214)"
         Height          =   285
         Index           =   2
         Left            =   150
         TabIndex        =   6
         Top             =   1215
         Width           =   3015
      End
      Begin VB.OptionButton Option1 
         Caption         =   "Part of code (3500,2244,2000,456)"
         Height          =   285
         Index           =   1
         Left            =   150
         TabIndex        =   5
         Top             =   750
         Width           =   3015
      End
      Begin VB.OptionButton Option1 
         Caption         =   "All area (0,0,5984,2756)"
         Height          =   285
         Index           =   0
         Left            =   150
         TabIndex        =   4
         Top             =   315
         Width           =   3015
      End
   End
   Begin VB.ComboBox Combo1 
      Height          =   315
      Left            =   5385
      Style           =   2  'Dropdown List
      TabIndex        =   0
      Top             =   2835
      Width           =   1395
   End
   Begin OposCheckScanner_CCOCtl.OPOSCheckScanner OPOSCheckScanner1 
      Left            =   1200
      OleObjectBlob   =   "sChkScan7.frx":0000
      Top             =   3960
   End
   Begin OposMICR_CCOCtl.OPOSMICR OPOSMICR1 
      Left            =   480
      OleObjectBlob   =   "sChkScan7.frx":0024
      Top             =   3960
   End
   Begin VB.Label Label3 
      BorderStyle     =   1  'Fixed Single
      Height          =   300
      Left            =   3480
      TabIndex        =   15
      Top             =   405
      Width           =   3300
   End
   Begin VB.Label Label1 
      BorderStyle     =   1  'Fixed Single
      Height          =   300
      Left            =   3480
      TabIndex        =   14
      Top             =   60
      Width           =   3300
   End
   Begin VB.Label Label5 
      Alignment       =   1  'Right Justify
      Caption         =   "CurrentMode : "
      Height          =   300
      Left            =   1320
      TabIndex        =   13
      Top             =   3465
      Width           =   2025
   End
   Begin VB.Label Label2 
      Alignment       =   1  'Right Justify
      Caption         =   "DataSize :"
      Height          =   300
      Left            =   2385
      TabIndex        =   2
      Top             =   90
      Width           =   960
   End
   Begin VB.Label Label4 
      Alignment       =   1  'Right Justify
      Caption         =   "Rest number of ""Store"" :"
      Height          =   300
      Left            =   1320
      TabIndex        =   1
      Top             =   450
      Width           =   2025
   End
End
Attribute VB_Name = "Step7"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 7 Changing reading mode.
Option Explicit

Private m_cscnPath As String 'path .bmp or .tif or .jpg
Private m_blnMicrEvent As Boolean
Private m_strMicrData As String
Private m_lStoreIndex As Long
Private m_lImgFormat As Long
Private m_bMicrError As Boolean
Private m_strChangeMode(1) As String
Private m_strCurrentMode As String

Private Sub cmdExit_Click()
    'Close Aplication
    Unload Me
End Sub

Private Sub cmdRetrieveSt_Click()

    Dim strParam As String
    Dim lLen As Long
    Dim strErrMsg As String
    Dim strXMLPath As String
    Dim strFindXMLPath As String

    strParam = txtRetrieveSt.Text
    strErrMsg = ""
    strFindXMLPath = ""

    ' Obtains the statistics of the device and stores it in a file.
    With OPOSCheckScanner1
        .RetrieveStatistics strParam
        If (.ResultCode <> OPOS_SUCCESS) Then
            strErrMsg = "RetrieveStatistics method error." + vbCrLf + vbCrLf + strErrMsg
            strErrMsg = strErrMsg + "ResultCode = " + CStr(.ResultCode) + vbCrLf
            strErrMsg = strErrMsg + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
            MsgBox strErrMsg, vbOKOnly + vbExclamation, "CheckScanner"
            Exit Sub
        End If
    End With
    
    strXMLPath = App.Path + "\Sample.xml"
    'Delete XML file.
    strFindXMLPath = Dir(strXMLPath)
    If strFindXMLPath <> "" Then
        Kill (strXMLPath)
    End If
    'Create XML file.
    Open strXMLPath For Binary Access Write As #1
        Put #1, , strParam
    Close #1
    
    ' Opens another window and indicates the information of the XML file.
    Step7Browser.Show

End Sub

Private Sub Combo2_Click()
    Dim strChangeData As String
    Dim bAtMicr As Boolean
    Dim lDum As Long
    Dim strDum As String
    
    strChangeData = Combo2.List(Combo2.ListIndex)
    
    If (m_strCurrentMode = strChangeData) Then
        Exit Sub
    End If
    
    With OPOSCheckScanner1
        Select Case strChangeData
            Case m_strChangeMode(0)
                lDum = CHK_DI_MODE_CHECKSCANNER
                If (m_bMicrError = False) Then
                    bAtMicr = True
                Else
                    bAtMicr = False
                End If
            Case m_strChangeMode(1)
                lDum = CHK_DI_MODE_CARDSCANNER
                bAtMicr = False
            Case Else
                Exit Sub
        End Select
        
        .DirectIO CHK_DI_CHANGE_MODE, lDum, strDum
        
        If (.ResultCode <> OPOS_SUCCESS) Then
            Combo2.Text = m_strCurrentMode
            Exit Sub
        Else
            Command4.Enabled = bAtMicr
            m_strCurrentMode = strChangeData
        End If
        
        .ImageFormat = m_lImgFormat

        Select Case .ImageFormat
        Case CHK_IF_TIFF
            m_cscnPath = "\Step7.tif" 'case .tif
        Case CHK_IF_BMP
            m_cscnPath = "\Step7.bmp" 'case .bmp
        Case CHK_IF_JPEG
            m_cscnPath = "\Step7.jpg" 'case .jpg
        Case Else
            m_cscnPath = "\Step7.bmp" 'case .bmp
        End Select

    End With
    
End Sub

Private Sub Command1_Click()
    
    'Clear displayed "DataSize"
    Label1.Caption = ""
    DoEvents
    
    With OPOSCheckScanner1
        'EventClear
        .ClearInput
        
        'Ready to fired event
        .DataEventEnabled = True
                        
        'When Contrast property is used.
'        .Color = CHK_CL_GRAYSCALE
'        .Contrast = 0 'lightest image (0-49)
''        .Contrast = 50 'default
''        .Contrast = 90 'darkest image (51-100)
        
        'Add timeout function.
        While .BeginInsertion(3000) = OPOS_E_TIMEOUT
            If (MsgBox("Please insert a check.", vbOKCancel + vbQuestion) = vbCancel) Then
                .EndInsertion
                Exit Sub
            End If
            DoEvents
        Wend
                
        'Set paper & Scanning
        .EndInsertion
        
        'Call to retrieve an image to the ImageData proparty
        .RetrieveImage CHK_CROP_AREA_ENTIRE_IMAGE
        
        If .ResultCode = OPOS_SUCCESS Then
            
            'Enable "CroppingArea" Group
            Frame1.Enabled = True

            'Enable "Renge" Option
            Option1(0).Enabled = True
            Option1(1).Enabled = True
            Option1(2).Enabled = True
            Option1(0).Value = True
            
        End If
        
    End With

End Sub

Private Sub Command2_Click()

    With OPOSCheckScanner1
    
        'Set FileID
        .FileID = "Epson CheckScanner SampleProgram Step7"
    
        'Set FileID
        .ImageTagData = "Epson CheckScanner SampleProgram Step7 ImageTagData"
    
        'Clear Image Data File
        .ClearImage CHK_CLR_BY_FILEID
        
        'StoreImage
        .StoreImage m_lStoreIndex
        
        'Displayed "rest number"
        Label3.Caption = CStr(.RemainingImagesEstimate)
        
    End With
    
    MsgBox ("A data was stored.")
    
End Sub

Private Sub Command3_Click()

    Dim lDataSize As Long
    
    'Get file size
    lDataSize = GetDataSize
    
    'Dispay ImageDataSize
    Label1.Caption = CStr(lDataSize) & " byte"
    
    Call CreateFile(lDataSize)
    
    'Disable "CreateFile" button
    Command3.Enabled = False
    
    'finish message
    MsgBox ("A file was created")

End Sub

Private Sub Command4_Click()
    
    Dim strReadRange As String 'DirectIO read range
    Dim lReadData As Long   'DirectIO data "ECHK_DI_EXTEND_PRESCAN"Or"ECHK_DI_EXTEND_READAREA" Or "ECHK_DI_EXTEND_ATTACHED"
    Dim strDum As String    'DirectIO dummy data
    Dim lDum As Long        'DirectIO dummy data
    
    'Clear displayed "DataSize"
    Label1.Caption = ""
    DoEvents
    
    With OPOSMICR1
        'Ready to fired event
        .DataEventEnabled = True
        
        If m_blnMicrEvent Then
            Exit Sub
        End If
        
        m_strMicrData = "DefaultData"
        
        While .BeginInsertion(3000) = OPOS_E_TIMEOUT
            If (MsgBox("Please insert a check.", vbOKCancel + vbQuestion) = vbCancel) Then
                .EndInsertion
                Exit Sub
            End If
            DoEvents
        Wend
        'Set paper
        .EndInsertion
        
    End With
    
        Do Until m_blnMicrEvent
            DoEvents
        Loop
        
        '///////////////CheckScanner Section
        
        With OPOSCheckScanner1
            .DocumentHeight = 2756
            .DocumentWidth = 5984
            
            
            strReadRange = "197,0,5984,2756"
            lReadData = ECHK_DI_EXTEND_READAREA + ECHK_DI_EXTEND_ATTACHED + ECHK_DI_EXTEND_PRESCAN
            
            .DirectIO ECHK_DI_READ_AREA, lDum, strReadRange
            .DirectIO ECHK_DI_ATTACHED_DATA, lDum, m_strMicrData
            
            .DirectIO ECHK_DI_ENDINSERTION_EXTEND, lReadData, strDum
            
            'Ready to fired event
            .DataEventEnabled = True
        
            'Read TIFF file
            .ImageFormat = CHK_IF_TIFF
            
            'Set paper & Scanning
            .BeginInsertion (3000)
            .EndInsertion
            
            'Call to retrieve an image to the ImageData proparty
            .RetrieveImage CHK_CROP_AREA_ENTIRE_IMAGE
            
            If .ResultCode = OPOS_SUCCESS Then
                'Enable "CroppingArea" Group
                Frame1.Enabled = True
        
                'Enable "Renge" Option
                Option1(0).Enabled = True
                Option1(1).Enabled = True
                Option1(2).Enabled = True
                Option1(0).Value = True
            End If
            
            'Clear DirectIO setting area
            lReadData = ECHK_DI_EXTEND_DEFAULT
            .DirectIO ECHK_DI_ENDINSERTION_EXTEND, lReadData, strDum
            
        End With
        m_blnMicrEvent = False
        
End Sub

Private Sub Command5_Click()
    
    Dim lCnt As Long        'Loop count
    Dim strStep As String   '"Step2" or "Step3" or "Step4" or "Step5" or "Step6" or "Step7"
    
    With Combo1
        strStep = .List(.ListIndex)
        strStep = "Epson CheckScanner SampleProgram " & strStep
    End With
    
    With OPOSCheckScanner1
    
        'Ready to fired event
        .DataEventEnabled = True
        
        .FileID = strStep
        
        'Speciffic "FileID"
        .RetrieveMemory CHK_LOCATE_BY_FILEID
        
        .ClearImage CHK_CLR_BY_FILEID
        
        'Displayed "rest number"
        Label3.Caption = CStr(.RemainingImagesEstimate)
        DoEvents
        
        If .ResultCode <> OPOS_SUCCESS Then
            'Error MessageBox
            MsgBox "NoData!"
        Else
            'Disable "CroppingArea" Group
            Frame1.Enabled = False
    
            'Disable "Renge" Option
            Option1(0).Enabled = False
            Option1(1).Enabled = False
            Option1(2).Enabled = False
        End If

    End With

End Sub

Private Sub Option1_Click(Index As Integer)
    
    Dim lCropAreaIndex As Long
    
    lCropAreaIndex = Index + 1
    
    With OPOSCheckScanner1
        'Ready to fired event
        .DataEventEnabled = True
    
        Select Case Index
            Case 0
                .DefineCropArea lCropAreaIndex, 0, 0, CHK_CROP_AREA_RIGHT, CHK_CROP_AREA_BOTTOM
            Case 1
                .DefineCropArea lCropAreaIndex, 3500, 2244, 2000, 456
            Case 2
                .DefineCropArea lCropAreaIndex, 5100, 236, 490, 214
        End Select
        
        .RetrieveImage lCropAreaIndex
        m_lStoreIndex = lCropAreaIndex
    End With
    
End Sub

Private Sub Form_Load()
    
    Dim OBJ As Object
    Dim lSupportList(2) As Long
    Dim lCount As Long
    Dim lSupportMode As Long
    Dim strSupportMode As String
    Dim strDum As String
    
    m_blnMicrEvent = False
    
    'Set "DefaultData"
    m_strMicrData = "DefaultData"
    
    m_lStoreIndex = 1
    
    With Combo1
        .AddItem "Step2"
        .AddItem "Step3"
        .AddItem "Step4"
        .AddItem "Step5"
        .AddItem "Step6"
        .AddItem "Step7"
        .ListIndex = 0  'Step2
    End With
    
    lSupportList(0) = CHK_DI_CHECKSCANNER
    lSupportList(1) = CHK_DI_CARDSCANNER
    lSupportList(2) = CHK_DI_TMSTORAGE
    
    m_strChangeMode(0) = "CheckScanner"
    m_strChangeMode(1) = "CardScanner"
    
    With OPOSCheckScanner1
    
        'Open the device
        'Use a Logical Device Name which has been set on the SetupPOS.
        .Open "Unit1"
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "This device has not been registered, or cannot use."
            GoTo LoadError
        End If
        
        'Get the exclusive control right for the opened device.
        'Then the device is disable from other application.
        '(Notice:When using an old CO, use the Claim.)
        .ClaimDevice 1000
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to get the exclusive right for the device."
            GoTo LoadError
        End If
        
        'Power reporting
        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If

        'Enable the device.
        .DeviceEnabled = True
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Now the device is disable to use."
            GoTo LoadError
        End If
        
        'Read TIFF file
        .ImageFormat = CHK_IF_TIFF
        
        'Read BMP file format
        '.ImageFormat = CHK_IF_BMP
        
        'Read JPEG file format
        '.ImageFormat = CHK_IF_JPEG
        
        m_lImgFormat = .ImageFormat
        
        Select Case .ImageFormat
        Case CHK_IF_TIFF
            m_cscnPath = "\Step7.tif" 'case .tif
        Case CHK_IF_BMP
            m_cscnPath = "\Step7.bmp" 'case .bmp
        Case CHK_IF_JPEG
            m_cscnPath = "\Step7.jpg" 'case .jpg
        Case Else
            m_cscnPath = "\Step7.bmp" 'case .bmp
        End Select

        .DirectIO CHK_DI_GET_SUPPORT_FUNCTION, lSupportMode, strDum
        For lCount = 2 To 0 Step -1
            If (lSupportList(lCount) <= lSupportMode) Then
                lSupportMode = lSupportMode - lSupportList(lCount)
                Select Case lCount
                    Case 0
                        Combo2.AddItem m_strChangeMode(lCount), 0
                        Command4.Enabled = True
                    Case 1
                        Combo2.AddItem m_strChangeMode(lCount), 0
                        Command4.Enabled = False
                End Select
            End If
        Next
        
        m_strCurrentMode = Combo2.List(0)
        
        If (Combo2.ListCount > 0) Then
            Combo2.ListIndex = 0
        Else
            Combo2.Enabled = False
        End If

'        lSupportMode = CHK_DI_SHARPNESS_ON
'        .DirectIO CHK_DI_SHARPNESS_IMAGE, lSupportMode, strDum

        'Set the edit box of parameter input.Set the edit box of parameter input.
        txtRetrieveSt.Text = "ModelName,HoursPoweredCount"
        
        ' Checks whether it has function to obtain
        ' the statistics of devices.
        ' If it does not have the function, invalidates
        ' the [Retrieve Statistics] button and the edit box
        ' of parameter input.
        If .CapStatisticsReporting = False Then
            cmdRetrieveSt.Enabled = False
            txtRetrieveSt.Enabled = False
            Frame5.Enabled = False
        End If

    End With

    With OPOSMICR1
        m_bMicrError = False
        'Open the device
        'Use a Logical Device Name which has been set on the SetupPOS.
        .Open "Unit1"
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "This device has not been registered, or cannot use."
            m_bMicrError = True
            GoTo LoadMICRError
        End If
        
        'Get the exclusive control right for the opened device.
        'Then the device is disable from other application.
        '(Notice:When using an old CO, use the Claim.)
        .ClaimDevice 1000
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to get the exclusive right for the device."
            m_bMicrError = True
            GoTo LoadMICRError
        End If
        
        'Power reporting
        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If

        'Enable the device.
        .DeviceEnabled = True
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Now the device is disable to use."
            m_bMicrError = True
            GoTo LoadMICRError
        End If

    End With
    
LoadMICRError:
    If (m_bMicrError) Then
        Command4.Enabled = False
    End If
    
    'Disable "CroppingArea" Group
    Frame1.Enabled = False
    
    'Disable "Renge" Option
    Option1(0).Enabled = False
    Option1(1).Enabled = False
    Option1(2).Enabled = False
    
    'Disable "Store" button
    Command2.Enabled = False
    
    'Disable "create" button
    Command3.Enabled = False
    
    Exit Sub
    
    'Go to
    'Disable Button
LoadError:
    
    For Each OBJ In Me
        If OBJ.Name <> "OPOSCheckScanner1" And OBJ.Name <> "OPOSMICR1" Then
            OBJ.Enabled = False
        End If
    Next
    
    'Enabled exit button
    cmdExit.Enabled = True             'Only the exit button is enabled.

End Sub

Private Sub Form_Unload(Cancel As Integer)
    
    With OPOSCheckScanner1
    
        'remove paper
        .BeginRemoval OPOS_FOREVER
        .EndRemoval
        
        'Cancel the device
        .DeviceEnabled = False

        'Release the device exclusive control right.
        '(Notice:When using an old CO, use the Release.)
        .ReleaseDevice

        'Finish using the device.
        .Close
        
    End With

    With OPOSMICR1
    
        'remove paper
        .BeginRemoval OPOS_FOREVER
        .EndRemoval

        'Cancel the device
        .DeviceEnabled = False

        'Release the device exclusive control right.
        '(Notice:When using an old CO, use the Release.)
        .ReleaseDevice

        'Finish using the device.
        .Close
        
    End With

End Sub

Private Sub OPOSCheckScanner1_ErrorEvent(ByVal ResultCode As Long, ByVal ResultCodeExtended As Long, ByVal ErrorLocus As Long, pErrorResponse As Long)
    
    'Error MessageBox
    MsgBox "CheckScanner Error!" + vbCrLf + vbCrLf + "ResultCode = " + CStr(ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(ResultCodeExtended)
    
    'Begin removal
    If ResultCode = OPOS_E_ILLEGAL Then
        With OPOSCheckScanner1
            .BeginRemoval OPOS_FOREVER
            .EndRemoval
        End With
    End If
    
End Sub

Private Sub OPOSCheckScanner1_DataEvent(ByVal Status As Long)
    
    'Ready to fired event
    OPOSCheckScanner1.DataEventEnabled = True
    
    'Dispay ImageDataSize
    Label1.Caption = CStr(GetDataSize) & " byte"
    
    'Enable "Store" button
    Command2.Enabled = True
    
    'Enable "CreateFile" button
    Command3.Enabled = True
    
End Sub

Private Sub OPOSMICR1_DataEvent(ByVal Status As Long)
    
    'End Doevents
    m_blnMicrEvent = True
    
    'Set "MICR RawData"
    m_strMicrData = OPOSMICR1.RawData
    
End Sub

Private Sub OPOSMICR1_ErrorEvent(ByVal ResultCode As Long, ByVal ResultCodeExtended As Long, ByVal ErrorLocus As Long, pErrorResponse As Long)
    
    'Error MessageBox
    MsgBox "MICR Error!" + vbCrLf + vbCrLf + "ResultCode = " + CStr(ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(ResultCodeExtended)
    
    'Begin removal
    If ResultCode = OPOS_E_ILLEGAL Then
    
        With OPOSMICR1
            .BeginRemoval OPOS_FOREVER
            .EndRemoval
        End With
        
    End If
    
    'End Doevents
    m_blnMicrEvent = True
    
    'Set "ErrorData"
    m_strMicrData = "ErrorData"
    
End Sub

Private Function GetDataSize() As Long

    Dim strIMSizeData As String
    Dim lImageDataSize As Long
    Dim lNowBinaryConversion As Long
    
    With OPOSCheckScanner1
    
        'Now BinaryConversion
        lNowBinaryConversion = .BinaryConversion
        
        'Set BinaryConversion
        .BinaryConversion = OPOS_BC_NIBBLE
        
        'Copy to ImageData
        strIMSizeData = .ImageData
        
        'GetDataSize
        lImageDataSize = Len(strIMSizeData) / 2
    
        'Re BinaryConversion
        .BinaryConversion = lNowBinaryConversion
            
    End With
    
    'Return ImageDataSize
    GetDataSize = lImageDataSize
    
End Function

Private Sub CreateFile(ByRef lImDataSize As Long)

    Dim rtBNext As Long   'See part of 2byte
    Dim rtBLen As Long    'Byte Array Count
    Dim strHigh As String 'byte High
    Dim strLow As String  'byte Low
    Dim strIMData As String 'Main Data
    Dim bytTrans() As Byte 'dynamic array declaration statement
    Dim lNowBinaryConversion As Long 'Now BinaryConversion

    rtBNext = 1 'start position
    
    With OPOSCheckScanner1
    
        'Now BinaryConversion
        lNowBinaryConversion = .BinaryConversion
        
        'SetBinaryConversion
        .BinaryConversion = OPOS_BC_NIBBLE
        
        'Copy to ImageData
        strIMData = .ImageData

        ReDim bytTrans(lImDataSize - 1) '2byte--->1byte
        
        For rtBLen = 0 To lImDataSize - 1
            strHigh = Mid(strIMData, rtBNext, 1) 'first string
            strLow = Mid(strIMData, rtBNext + 1, 1) 'second string
            rtBNext = rtBNext + 2
            bytTrans(rtBLen) = CByte(ChangeAsc(strHigh) * 16 + ChangeAsc(strLow))
            DoEvents
        Next rtBLen
        
        'Save file for binary mode
        Open App.Path & m_cscnPath For Binary As #1
            Put #1, , bytTrans
        Close #1
        
        'Re BinaryConversion
        .BinaryConversion = lNowBinaryConversion
        
    End With
    
End Sub

'change specialized epson string
Private Function ChangeAsc(strCmd As String) As Byte

    Select Case strCmd
        Case ":"
            ChangeAsc = 10
        Case ";"
            ChangeAsc = 11
        Case "<"
            ChangeAsc = 12
        Case "="
            ChangeAsc = 13
        Case ">"
            ChangeAsc = 14
        Case "?"
            ChangeAsc = 15
        Case Else
            ChangeAsc = CByte(strCmd)
    End Select
    
End Function

