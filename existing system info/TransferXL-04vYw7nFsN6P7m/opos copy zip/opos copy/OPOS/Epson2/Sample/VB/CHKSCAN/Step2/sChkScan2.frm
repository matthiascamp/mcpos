VERSION 5.00
Object = "{CCB90230-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSCheckScanner.ocx"
Begin VB.Form Step2 
   BorderStyle     =   4  'Fixed ToolWindow
   Caption         =   "Step 2 Adding ""Store Image"" function."
   ClientHeight    =   3945
   ClientLeft      =   45
   ClientTop       =   285
   ClientWidth     =   5580
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   4607.637
   ScaleMode       =   0  'User
   ScaleWidth      =   5580
   ShowInTaskbar   =   0   'False
   StartUpPosition =   3  'Windows Default
   Begin VB.CommandButton Command2 
      Caption         =   "Store"
      Height          =   690
      Left            =   1320
      TabIndex        =   1
      Top             =   2490
      Width           =   2745
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Read"
      Height          =   690
      Left            =   1320
      TabIndex        =   0
      Top             =   1320
      Width           =   2745
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Exit"
      Height          =   420
      Left            =   4380
      TabIndex        =   2
      Top             =   3210
      Width           =   945
   End
   Begin OposCheckScanner_CCOCtl.OPOSCheckScanner OPOSCheckScanner1 
      Left            =   4560
      OleObjectBlob   =   "sChkScan2.frx":0000
      Top             =   2040
   End
   Begin VB.Label Label4 
      Caption         =   "Rest number of ""Store"" :"
      Height          =   345
      Left            =   90
      TabIndex        =   5
      Top             =   570
      Width           =   2025
   End
   Begin VB.Label Label3 
      BorderStyle     =   1  'Fixed Single
      Height          =   345
      Left            =   2250
      TabIndex        =   6
      Top             =   570
      Width           =   3075
   End
   Begin VB.Label Label1 
      BorderStyle     =   1  'Fixed Single
      Height          =   345
      Left            =   2250
      TabIndex        =   4
      Top             =   90
      Width           =   3075
   End
   Begin VB.Label Label2 
      Caption         =   "DataSize :"
      Height          =   345
      Left            =   1110
      TabIndex        =   3
      Top             =   120
      Width           =   825
   End
End
Attribute VB_Name = "Step2"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 2 Adding "Store Image" function.
Option Explicit

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
        .BeginInsertion (5000)
        .EndInsertion
        
        'Call to retrieve an image to the ImageData proparty
        .RetrieveImage CHK_CROP_AREA_ENTIRE_IMAGE
        
    End With
    
End Sub

Private Sub Command2_Click()

    With OPOSCheckScanner1
        'Set FileID
        .FileID = "Epson CheckScanner SampleProgram Step2"
    
        'Set FileID
        .ImageTagData = "Epson CheckScanner SampleProgram Step2 ImageTagData"
    
        'Clear Image Data File
        .ClearImage CHK_CLR_BY_FILEID
        
        'StoreImage
        .StoreImage CHK_CROP_AREA_ENTIRE_IMAGE
        
        'Displayed "rest number"
        Label3.Caption = CStr(.RemainingImagesEstimate)
        
    End With
    
    MsgBox ("A data was stored.")
    
End Sub

Private Sub Form_Load()
    
    Dim OBJChkScan As Object
    
    'Disable "Store" button
    Command2.Enabled = False
    
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
        
        'Read tiff file
        .ImageFormat = CHK_IF_TIFF
        
        'Read BMP file format
        '.ImageFormat = CHK_IF_BMP
        
        'Read JPEG file format
        '.ImageFormat = CHK_IF_JPEG
        
    End With
    
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
    
    'Dispay ImageDataSize
    Label1.Caption = CStr(GetDataSize) & " byte"
    
    'Enable "Store" button
    Command2.Enabled = True
    
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
