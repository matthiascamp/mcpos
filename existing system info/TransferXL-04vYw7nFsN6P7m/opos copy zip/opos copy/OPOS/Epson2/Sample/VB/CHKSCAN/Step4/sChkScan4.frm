VERSION 5.00
Object = "{CCB90230-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSCheckScanner.ocx"
Begin VB.Form Step4 
   BorderStyle     =   4  'Fixed ToolWindow
   Caption         =   "Step 4 Specify reading area and cropping area."
   ClientHeight    =   3795
   ClientLeft      =   45
   ClientTop       =   285
   ClientWidth     =   6540
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3795
   ScaleWidth      =   6540
   ShowInTaskbar   =   0   'False
   StartUpPosition =   3  'Windows Default
   Begin VB.CommandButton Command2 
      Caption         =   "Store"
      Height          =   690
      Left            =   90
      TabIndex        =   1
      Top             =   1950
      Width           =   2745
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Read"
      Height          =   690
      Left            =   90
      TabIndex        =   0
      Top             =   1110
      Width           =   2745
   End
   Begin VB.CommandButton Command3 
      Caption         =   "CreateFile"
      Height          =   690
      Left            =   90
      TabIndex        =   6
      Top             =   2880
      Width           =   2745
   End
   Begin VB.Frame Frame1 
      Caption         =   "Cropping area"
      Height          =   1665
      Left            =   3120
      TabIndex        =   2
      Top             =   1110
      Width           =   3255
      Begin VB.OptionButton Option1 
         Caption         =   "Part of number (5100,236,490,214)"
         Height          =   285
         Index           =   2
         Left            =   150
         TabIndex        =   5
         Top             =   1080
         Width           =   3015
      End
      Begin VB.OptionButton Option1 
         Caption         =   "Part of code (3500,2244,2000,456)"
         Height          =   285
         Index           =   1
         Left            =   150
         TabIndex        =   4
         Top             =   660
         Width           =   3015
      End
      Begin VB.OptionButton Option1 
         Caption         =   "All area (0,0,5984,2756)"
         Height          =   285
         Index           =   0
         Left            =   150
         TabIndex        =   3
         Top             =   240
         Width           =   3015
      End
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Exit"
      Height          =   420
      Left            =   5430
      TabIndex        =   7
      Top             =   3150
      Width           =   945
   End
   Begin OposCheckScanner_CCOCtl.OPOSCheckScanner OPOSCheckScanner1 
      Left            =   3960
      OleObjectBlob   =   "sChkScan4.frx":0000
      Top             =   3000
   End
   Begin VB.Label Label2 
      Caption         =   "DataSize :"
      Height          =   345
      Left            =   1260
      TabIndex        =   11
      Top             =   90
      Width           =   825
   End
   Begin VB.Label Label1 
      BorderStyle     =   1  'Fixed Single
      Height          =   345
      Left            =   2400
      TabIndex        =   10
      Top             =   60
      Width           =   3075
   End
   Begin VB.Label Label3 
      BorderStyle     =   1  'Fixed Single
      Height          =   345
      Left            =   2400
      TabIndex        =   9
      Top             =   540
      Width           =   3075
   End
   Begin VB.Label Label4 
      Caption         =   "Rest number of ""Store"" :"
      Height          =   345
      Left            =   240
      TabIndex        =   8
      Top             =   540
      Width           =   2025
   End
End
Attribute VB_Name = "Step4"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 4 Specify reading area and cropping area.
Option Explicit
Private m_cscnPath As String 'path .bmp or .tif or .jpg
Private m_lStoreIndex As Long

Private Sub cmdExit_Click()

    'Close Aplication
    Unload Me
    
End Sub

Private Sub Command1_Click()
    
    'Data size clear
    Label1.Caption = ""
    DoEvents
    
    With OPOSCheckScanner1
    
        'EventClear
        .ClearInput
        
        'Ready to fired event
        .DataEventEnabled = True
                        
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
        .FileID = "Epson CheckScanner SampleProgram Step4"
    
        'Set FileID
        .ImageTagData = "Epson CheckScanner SampleProgram Step4 ImageTagData"
    
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
    
    'CreateFile
    Call CreateFile(GetDataSize)
    
    'CreateFile button Disable
    Command3.Enabled = False
    
    'finish message
    MsgBox ("A file was created")
    
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
    
    Dim OBJChkScan As Object
    
    m_lStoreIndex = 1
    
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
        
        'Ready to fired event
        .DataEventEnabled = True
        
        'Read TIFF file
        .ImageFormat = CHK_IF_TIFF
        
        'Read BMP file format
        '.ImageFormat = CHK_IF_BMP
        
        'Read JPEG file format
        '.ImageFormat = CHK_IF_JPEG
        
        
        Select Case .ImageFormat
        Case CHK_IF_TIFF
            m_cscnPath = "\Step4.tif" 'case .tif
        Case CHK_IF_BMP
            m_cscnPath = "\Step4.bmp" 'case .bmp
        Case CHK_IF_JPEG
            m_cscnPath = "\Step4.jpg" 'case .jpg
        Case Else
            m_cscnPath = "\Step4.bmp" 'case .bmp
        End Select
        
    End With
    
    'Disable "Store" button
    Command2.Enabled = False
    
    'Disable "CreateFile" button
    Command3.Enabled = False
    
    'Disable "CroppingArea" Group
    Frame1.Enabled = False
    
    'Disable "Renge" Option
    Option1(0).Enabled = False
    Option1(1).Enabled = False
    Option1(2).Enabled = False

    Exit Sub
    
    'Go to
    'Disable button
LoadError:
    
    For Each OBJChkScan In Me
        If OBJChkScan.Name <> "OPOSCheckScanner1" Then
            OBJChkScan.Enabled = False
        End If
    Next
    
    'Enabled exit button
    cmdExit.Enabled = True              'Only the exit button is enabled.
    
End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSCheckScanner1
    
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
    
    'Enable CreateFile button
    Command3.Enabled = True
    
End Sub

Private Function GetDataSize() As Long

    Dim strIMSizeData As String
    Dim lImageDataSize As Long
    Dim lNowBinaryConversion As Long
    
    With OPOSCheckScanner1
    
        'Now BinaryConversion
        lNowBinaryConversion = .BinaryConversion
        
        'SetBinaryConversion
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

