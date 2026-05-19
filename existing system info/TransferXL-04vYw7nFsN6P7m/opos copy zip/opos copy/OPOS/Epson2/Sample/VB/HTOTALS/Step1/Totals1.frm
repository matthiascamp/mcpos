VERSION 5.00
Object = "{CCB90080-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSTotals.ocx"
Begin VB.Form Step1 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 1 Create a file for data access (read/write)."
   ClientHeight    =   1695
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   5370
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   1695
   ScaleWidth      =   5370
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   4200
      TabIndex        =   3
      Top             =   105
      Width           =   990
   End
   Begin VB.TextBox Text1 
      Height          =   270
      Left            =   315
      TabIndex        =   1
      Text            =   "DATA"
      Top             =   420
      Width           =   3690
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Register"
      Height          =   450
      Left            =   2520
      TabIndex        =   0
      Top             =   840
      Width           =   1515
   End
   Begin OposTotals_CCOCtl.OPOSTotals OPOSTotals1 
      Left            =   4440
      OleObjectBlob   =   "Totals1.frx":0000
      Top             =   720
   End
   Begin VB.Label Label1 
      Caption         =   "Register data."
      Height          =   225
      Left            =   315
      TabIndex        =   2
      Top             =   210
      Width           =   1485
   End
End
Attribute VB_Name = "Step1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 1 Create a file for data access (read/write).

Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub


Private Sub Command1_Click()

    Dim pHandle As Long

    Me.MousePointer = vbHourglass

    OPOSTotals1.Create "Step1", pHandle, 128, False
    OPOSTotals1.Write pHandle, Text1.Text, 0, LenDBCS(Text1.Text)

    Me.MousePointer = vbDefault

End Sub

Private Sub Form_Load()

    With OPOSTotals1
        'Open the device
        'Use a Logical Device Name which has been set on the SetupPOS.
        .Open "Unit1"
        
        'Get the exclusive control right for the opened device.
        'Then the device is disable from other application.
        
        '(Notice:When using an old CO, use the Claim.)
        .ClaimDevice 1000
        
        'Enable the device.
        .DeviceEnabled = True
    End With

End Sub


Private Sub Form_Unload(Cancel As Integer)

    With OPOSTotals1
        'Cancel the device
        .DeviceEnabled = False
        
        'Release the device exclusive control right.
        '(Notice:When using an old CO, use the Release.)
        .ReleaseDevice
        
        'Finish using the device.
        .Close
    End With

End Sub

Function LenDBCS(Data As String) As Long

    Dim i As Integer
    Dim m As Integer
    Dim c As Integer

    m = Len(Data)
    c = 0
    
    For i = 1 To m
        If Asc(Mid(Data, i, 1)) < 0 Then c = c + 1
    Next i

    LenDBCS = m + c

End Function
